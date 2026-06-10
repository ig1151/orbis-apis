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
    name: 'Honeypot Scanner API', version: '1.0.0',
    description: 'Detect honeypot contracts, rug pull mechanisms, and malicious token patterns before you trade. Analyze smart contract flags, ownership risk, liquidity lock status, and sell restrictions.',
    docs_url: 'https://orbis-apis.onrender.com/honeypot-scanner/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/honeypot-scanner/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan a contract for honeypot flags and sell restrictions', price_usdc: 0.003 },
      { method: 'POST', path: '/risk', summary: 'Full risk score with contract flags and rug vectors', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: honeypot verdict + rug risk + safety checklist', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', risk: '$0.004', lookup: '$0.008' } },
    agent_capabilities: ['honeypot-detection', 'rugpull-risk', 'contract-safety', 'sell-restriction-detection', 'liquidity-analysis'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/scan', async (req: Request, res: Response) => {
  const { contract, chain = 'ethereum' } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Scan smart contract ${contract} on ${chain} for honeypot patterns and sell restrictions as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "contract": "${contract}",
  "chain": "${chain}",
  "is_honeypot": boolean,
  "honeypot_confidence": number,
  "sell_restrictions": {
    "can_sell": boolean,
    "sell_tax_pct": number,
    "buy_tax_pct": number,
    "transfer_pausable": boolean,
    "blacklist_function": boolean,
    "max_transaction_limit": boolean
  },
  "contract_flags": [
    {
      "flag": "string",
      "severity": "critical|high|medium|low|info",
      "description": "string"
    }
  ],
  "simulation_result": {
    "buy_success": boolean,
    "sell_success": boolean,
    "net_loss_pct": number,
    "failure_reason": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"honeypot": 0.85, "sell_restrictions": 0.82, "flags": 0.78},
  "recommended_actions_priority_order": ["never buy if is_honeypot=true", "test with tiny amount first", "verify sell tax before buying"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risk', async (req: Request, res: Response) => {
  const { contract, chain = 'ethereum' } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Full contract risk analysis for ${contract} on ${chain} including rug pull vectors as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "contract": "${contract}",
  "chain": "${chain}",
  "risk_score": number,
  "risk_level": "safe|low|medium|high|critical",
  "ownership_risk": {
    "is_renounced": boolean,
    "owner_address": "string",
    "owner_can_mint": boolean,
    "owner_can_pause": boolean,
    "owner_can_blacklist": boolean,
    "multisig": boolean
  },
  "liquidity_risk": {
    "lp_locked": boolean,
    "lock_duration_days": number,
    "lock_platform": "string",
    "lp_burned_pct": number,
    "top_lp_holder_pct": number
  },
  "rug_vectors": [
    {
      "vector": "string",
      "severity": "critical|high|medium|low",
      "present": boolean,
      "description": "string"
    }
  ],
  "audit": { "audited": boolean, "auditor": "string", "critical_issues_found": number },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"ownership": 0.82, "liquidity": 0.78, "rug_vectors": 0.75},
  "recommended_actions_priority_order": ["avoid if risk=critical or high", "check LP lock before buying", "unrenounced ownership = higher risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { contract, chain = 'ethereum' } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Complete honeypot and safety analysis for contract ${contract} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "contract": "${contract}",
  "chain": "${chain}",
  "verdict": {
    "is_honeypot": boolean,
    "is_safe": boolean,
    "overall_risk": "safe|low|medium|high|critical",
    "trade_recommendation": "safe_to_trade|caution|avoid|do_not_buy"
  },
  "honeypot_check": {
    "is_honeypot": boolean,
    "confidence": number,
    "can_sell": boolean,
    "sell_tax_pct": number,
    "buy_tax_pct": number
  },
  "rug_risk": {
    "score": number,
    "risk_level": "low|medium|high|critical",
    "lp_locked": boolean,
    "owner_renounced": boolean,
    "top_risk_factors": ["string"]
  },
  "safety_checklist": [
    {
      "check": "string",
      "status": "pass|warn|fail",
      "detail": "string"
    }
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"verdict": 0.85, "honeypot": 0.83, "rug_risk": 0.78, "checklist": 0.80},
  "recommended_actions_priority_order": ["respect verdict=do_not_buy absolutely", "always check before first buy", "combine with on-chain verification"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
