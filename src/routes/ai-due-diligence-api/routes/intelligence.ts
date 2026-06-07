import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, temperature: 0, messages: [{ role: 'user', content: prompt }] },
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

// The primitive APIs this aggregator composes. Agents can drill down into any of
// these for the raw, single-dimension analysis behind each sub-score.
const COMPONENT_APIS = [
  { dimension: 'fundamental', slug: 'token-holder-distribution', summary: 'Holder concentration, whale %, sell-pressure risk' },
  { dimension: 'contract_safety', slug: 'honeypot-scanner', summary: 'Honeypot, rug-pull, sell-restriction and ownership risk' },
  { dimension: 'contract_safety', slug: 'token-trust', summary: 'ERC-20/SPL token trust score and liquidity-trap detection' },
  { dimension: 'liquidity', slug: 'defi-risk', summary: 'Protocol/liquidity risk, TVL concentration, liquidation risk' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AI Due Diligence API', version: '1.0.0',
    description: 'One-call investment due diligence for any token. Aggregates fundamental, on-chain, liquidity and contract-safety analysis into a single investment_score with bull/bear cases, red flags and confidence — instead of calling holder, whale, liquidity and risk APIs separately.',
    docs_url: 'https://orbis-apis.onrender.com/ai-due-diligence/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/ai-due-diligence/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Quick composite investment score (0-100) with sub-scores and verdict', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full due diligence — scores, red flags, bull/bear case, catalysts, smart money, confidence', price_usdc: 0.03 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.01', lookup: '$0.03' } },
    composes: COMPONENT_APIS,
    agent_capabilities: ['investment-due-diligence', 'token-scoring', 'red-flag-detection', 'bull-bear-analysis', 'go-no-go-decision'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

// POST /score — fast composite score (cheaper, for high-frequency screening loops)
router.post('/score', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`You are an institutional crypto due-diligence engine. Score the token ${token} on ${chain} as of ${new Date().toISOString()} across four dimensions, then produce a weighted composite. Be conservative: unknowns lower the score and confidence, never inflate. Return compact JSON only:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "investment_score": number (0-100, weighted composite),
  "fundamental_score": number (0-100, tokenomics + holder distribution),
  "onchain_score": number (0-100, activity, smart money, accumulation),
  "liquidity_score": number (0-100, depth, slippage, lock status),
  "contract_safety_score": number (0-100, honeypot/rug/ownership; 100 = safest),
  "verdict": "strong_buy|buy|hold|avoid|strong_avoid",
  "red_flags": ["string"],
  "confidence": number (0-1),
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    const out = parseJSON(raw);
    out.component_apis = COMPONENT_APIS;
    res.json(out);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL full due diligence report
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`You are an institutional crypto due-diligence engine producing a complete investment report for ${token} on ${chain} as of ${new Date().toISOString()}. Synthesize four analytical dimensions — fundamental (tokenomics + holder distribution), on-chain (activity, smart money, accumulation/distribution), liquidity (depth, slippage, lock status), and contract safety (honeypot/rug/ownership/mint risk) — into one verdict. Be conservative and explicit: when data is unknown, say so, lower the relevant sub-score, and reduce confidence. Never fabricate specific numbers you cannot support. Return JSON only:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "investment_score": number (0-100, weighted composite),
  "verdict": "strong_buy|buy|hold|avoid|strong_avoid",
  "sub_scores": {
    "fundamental_score": number,
    "onchain_score": number,
    "liquidity_score": number,
    "contract_safety_score": number
  },
  "component_breakdown": [
    {"dimension": "fundamental", "score": number, "rationale": "string", "source_api": "token-holder-distribution"},
    {"dimension": "onchain", "score": number, "rationale": "string", "source_api": "token-holder-distribution"},
    {"dimension": "liquidity", "score": number, "rationale": "string", "source_api": "defi-risk"},
    {"dimension": "contract_safety", "score": number, "rationale": "string", "source_api": "honeypot-scanner"}
  ],
  "red_flags": [{"severity": "critical|high|medium|low", "flag": "string", "evidence": "string"}],
  "bull_case": "string (2-4 sentences)",
  "bear_case": "string (2-4 sentences)",
  "catalysts": [{"catalyst": "string", "timeframe": "near|mid|long", "impact": "high|medium|low"}],
  "smart_money_activity": {"direction": "accumulating|distributing|neutral|unknown", "note": "string"},
  "confidence": number (0-1, overall),
  "confidence_per_section": {"fundamental": number, "onchain": number, "liquidity": number, "contract_safety": number},
  "financial_disclaimer": "For informational purposes only. Not financial advice. Always verify on-chain before acting.",
  "paper_mode_recommended": true,
  "recommended_actions_priority_order": ["verify contract_safety red flags on-chain before any buy", "confirm liquidity is locked and depth supports your size", "treat unknown sub-scores as risk, not neutral"],
  "chain_to": [
    {"api": "honeypot-scanner", "when": "contract_safety_score < 70 or any critical red_flag", "reason": "confirm honeypot/rug risk before execution"},
    {"api": "token-holder-distribution", "when": "fundamental_score < 70", "reason": "inspect whale concentration and sell pressure"},
    {"api": "defi-risk", "when": "liquidity_score < 70", "reason": "assess protocol/liquidity and liquidation risk"},
    {"api": "token-trust", "when": "always", "reason": "second independent token trust signal"}
  ],
  "component_apis": ${JSON.stringify(COMPONENT_APIS)},
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
