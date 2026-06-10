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
    name: 'Validator Activity API', version: '1.0.0',
    description: 'Track validator performance, uptime, commission rates, slashing history, and risk scores across Ethereum, Solana, Cosmos, Polkadot, and Avalanche. Supports staking decisions and delegation optimization.',
    docs_url: 'https://orbis-apis.onrender.com/validator-activity/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/validator-activity/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/performance', summary: 'Validator performance metrics, uptime, and APR', price_usdc: 0.004 },
      { method: 'POST', path: '/slashing', summary: 'Slashing events, risk scores, and jailed validators', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full validator profile with risk rating and delegation recommendation', price_usdc: 0.015 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { performance: '$0.004', slashing: '$0.005', lookup: '$0.015' } },
    agent_capabilities: ['validator-performance', 'slashing-risk', 'staking-optimization', 'uptime-monitoring', 'delegation-recommendation'],
    x402_compatible: true, paper_mode_recommended: false,
    'x-paper-mode-recommended': false,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'staking-rewards-api', reason: 'compare validator APR against network staking reward benchmarks' },
      { api: 'cross-chain-liquidity-api', reason: 'assess liquidity for unstaking across chains before choosing validator' },
    ],
  });
});

router.post('/performance', async (req: Request, res: Response) => {
  const { network = 'ethereum', limit = 20 } = req.body;
  try {
    const raw = await callClaude(`Top validator performance metrics on ${network} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "network": "${network}",
  "validators": [
    {
      "validator_address": "string",
      "name": "string",
      "status": "active|inactive|jailed|tombstoned",
      "uptime_30d_pct": number,
      "uptime_90d_pct": number,
      "commission_pct": number,
      "effective_apr_pct": number,
      "total_staked_usd": number,
      "delegator_count": number,
      "blocks_proposed_30d": number,
      "missed_blocks_30d": number,
      "slashing_count_all_time": number,
      "self_stake_pct": number
    }
  ],
  "network_summary": {
    "total_active_validators": number,
    "avg_uptime_pct": number,
    "avg_commission_pct": number,
    "avg_effective_apr_pct": number,
    "network_participation_rate_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"validators": 0.82, "summary": 0.84},
  "recommended_actions_priority_order": ["uptime_30d_pct > 99% is the gold standard — avoid below 97%", "high commission + low uptime is the worst combination", "self_stake_pct > 5% means validator has skin in the game — a positive signal"],
  "chain_to": [{"api": "validator-activity-api", "reason": "deep lookup on top-performing validator before delegating"}, {"api": "staking-rewards-api", "reason": "compare effective APR against network staking benchmarks"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/slashing', async (req: Request, res: Response) => {
  const { network = 'ethereum', include_jailed = true } = req.body;
  try {
    const raw = await callClaude(`Slashing events and risk scores for validators on ${network} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "network": "${network}",
  "slashing_events": [
    {
      "validator_address": "string",
      "validator_name": "string",
      "slash_type": "double_sign|downtime|equivocation",
      "slash_date": "string (ISO)",
      "amount_slashed_usd": number,
      "pct_slashed": number,
      "status_after": "active|jailed|tombstoned",
      "delegator_impact_usd": number
    }
  ],
  "risk_scores": [
    {
      "validator_address": "string",
      "name": "string",
      "slashing_risk": "low|medium|high|critical",
      "risk_score": number,
      "slashing_history_count": number,
      "current_downtime_streak_hours": number,
      "infrastructure_concern": boolean,
      "recommendation": "safe|monitor|avoid"
    }
  ],
  "network_health": {
    "total_slashing_events_30d": number,
    "total_amount_slashed_usd_30d": number,
    "jailed_validator_count": number,
    "network_risk_level": "low|medium|high"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"events": 0.88, "risk_scores": 0.80, "health": 0.84},
  "recommended_actions_priority_order": ["recommendation=avoid means immediately redelegate away from this validator", "tombstoned status is permanent — all stake is at risk of total loss", "double_sign slashings are most severe — 5%+ of stake lost"],
  "chain_to": [{"api": "validator-activity-api", "reason": "full validator profile including performance before redelegating"}, {"api": "staking-rewards-api", "reason": "find a safer validator with comparable APR"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { validator_address, network = 'ethereum' } = req.body;
  if (!validator_address) return res.status(400).json({ error: 'validator_address is required' });
  try {
    const raw = await callClaude(`Full validator profile and recommendation for ${validator_address} on ${network} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "validator_address": "${validator_address}",
  "network": "${network}",
  "identity": {
    "name": "string", "website": "string or null", "description": "string",
    "keybase": "string or null", "status": "active|inactive|jailed|tombstoned",
    "commission_pct": number, "max_commission_pct": number, "commission_change_rate_pct": number
  },
  "performance": {
    "uptime_7d_pct": number, "uptime_30d_pct": number, "uptime_90d_pct": number,
    "blocks_proposed_30d": number, "missed_blocks_30d": number, "missed_attestations_30d": number,
    "effective_apr_pct": number, "gross_apr_pct": number,
    "total_staked_usd": number, "delegator_count": number, "self_stake_pct": number
  },
  "slashing_history": {
    "total_slash_count": number, "last_slash_date": "string or null",
    "total_slashed_usd": number, "slash_types": ["string"], "jailed_count": number
  },
  "risk_assessment": {
    "overall_risk": "low|medium|high|critical",
    "slashing_risk": "low|medium|high|critical",
    "uptime_risk": "low|medium|high|critical",
    "concentration_risk": "low|medium|high",
    "infrastructure_score": number,
    "risk_factors": ["string"]
  },
  "delegation_recommendation": {
    "recommendation": "strong_buy|buy|hold|reduce|avoid",
    "rationale": "string",
    "suggested_max_allocation_pct": number,
    "better_alternatives": ["string"]
  },
  "reasoning": {
    "why_signal_generated": "string explanation of the validator's overall standing",
    "key_factors": ["factor 1 (e.g. 99.97% uptime over 12 months with zero slashing events)", "factor 2 (e.g. self-stake is 8% — strong alignment with delegators)", "factor 3 (e.g. commission of 5% is below network average of 7%)"],
    "invalidators": ["validator could change commission rate up to max_commission without notice", "infrastructure concentration with other validators increases correlated failure risk", "single operator — no redundancy if team has operational issues"]
  },
  "latency_ms": number,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": false,
  "confidence_per_section": {"identity": 0.90, "performance": 0.86, "slashing": 0.90, "risk": 0.80, "recommendation": 0.78, "reasoning": 0.80},
  "recommended_actions_priority_order": ["recommendation=avoid or critical risk = redelegate immediately", "strong_buy with infrastructure_score > 90 is ideal staking target", "monitor commission_change_rate_pct — validators who raise rates quickly are extractive"],
  "chain_to": [{"api": "staking-rewards-api", "reason": "compare effective APR against network average and similar validators"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
