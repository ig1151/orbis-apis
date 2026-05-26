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
    name: 'AI Trade Confidence API', version: '1.0.0',
    description: 'Score the confidence of any trade signal using AI multi-factor analysis. Validate trade setups with technical, fundamental, and sentiment signal alignment before execution.',
    docs_url: 'https://orbis-apis.onrender.com/ai-trade-confidence/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/ai-trade-confidence/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'AI confidence score for a trade signal', price_usdc: 0.003 },
      { method: 'POST', path: '/validate', summary: 'Validate a full trade setup with confluence analysis', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: confidence score + validation + risk-reward + go/no-go verdict', price_usdc: 0.010 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.003', validate: '$0.005', lookup: '$0.010' } },
    agent_capabilities: ['trade-confidence-scoring', 'signal-validation', 'confluence-analysis', 'risk-reward-assessment', 'go-no-go-verdict'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/score', async (req: Request, res: Response) => {
  const { asset, direction, timeframe = '4h', signal_source } = req.body;
  if (!asset || !direction) return res.status(400).json({ error: 'asset and direction are required' });
  try {
    const raw = await callClaude(`AI trade confidence score for ${direction.toUpperCase()} ${asset} on ${timeframe} timeframe${signal_source ? ` (signal from: ${signal_source})` : ''} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "direction": "${direction}",
  "timeframe": "${timeframe}",
  "confidence_score": number,
  "confidence_level": "very_high|high|moderate|low|very_low",
  "signal_factors": {
    "technical_score": number,
    "fundamental_score": number,
    "sentiment_score": number,
    "on_chain_score": number,
    "macro_score": number
  },
  "top_supporting_factors": ["string"],
  "top_contradicting_factors": ["string"],
  "verdict": "strong_signal|valid_signal|weak_signal|conflicted|fade",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"technical": 0.80, "fundamental": 0.72, "sentiment": 0.68},
  "recommended_actions_priority_order": ["high confidence ≠ guaranteed win", "always define stop loss before entry", "combine with position sizing rules"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { asset, direction, entry_price, stop_loss, take_profit, timeframe = '4h' } = req.body;
  if (!asset || !direction) return res.status(400).json({ error: 'asset and direction are required' });
  try {
    const raw = await callClaude(`Validate trade setup for ${direction.toUpperCase()} ${asset}: entry=${entry_price || 'market'}, stop=${stop_loss || 'undefined'}, target=${take_profit || 'undefined'}, timeframe=${timeframe} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "direction": "${direction}",
  "entry_price": ${entry_price || null},
  "stop_loss": ${stop_loss || null},
  "take_profit": ${take_profit || null},
  "timeframe": "${timeframe}",
  "setup_quality": {
    "score": number,
    "grade": "A|B|C|D|F",
    "issues": ["string"],
    "strengths": ["string"]
  },
  "risk_reward": {
    "ratio": number,
    "risk_pct": number,
    "reward_pct": number,
    "acceptable": boolean,
    "note": "string"
  },
  "confluence_analysis": {
    "aligned_signals": ["string"],
    "conflicting_signals": ["string"],
    "confluence_score": number,
    "verdict": "high_confluence|moderate|low_confluence|conflicted"
  },
  "key_levels": {
    "support": number,
    "resistance": number,
    "invalidation": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setup": 0.78, "rr": 0.82, "confluence": 0.72, "levels": 0.75},
  "recommended_actions_priority_order": ["fix D/F grade setups before trading", "minimum 2:1 risk-reward required", "invalidation level is a hard stop"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { asset, direction, entry_price, stop_loss, take_profit, timeframe = '4h' } = req.body;
  if (!asset || !direction) return res.status(400).json({ error: 'asset and direction are required' });
  try {
    const raw = await callClaude(`Full AI trade confidence analysis for ${direction.toUpperCase()} ${asset} on ${timeframe}: entry=${entry_price || 'market'}, stop=${stop_loss || 'define'}, target=${take_profit || 'define'} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "direction": "${direction}",
  "timeframe": "${timeframe}",
  "confidence_score": number,
  "confidence_level": "very_high|high|moderate|low|very_low",
  "signal_factors": {
    "technical_score": number,
    "fundamental_score": number,
    "sentiment_score": number,
    "on_chain_score": number
  },
  "setup_validation": {
    "grade": "A|B|C|D|F",
    "risk_reward_ratio": number,
    "confluence_verdict": "high|moderate|low|conflicted"
  },
  "risk_assessment": {
    "risk_level": "low|medium|high|very_high",
    "key_risks": ["string"],
    "max_recommended_position_pct": number
  },
  "go_no_go": {
    "verdict": "execute|wait|reduce_size|pass",
    "conviction": "high|medium|low",
    "rationale": "string",
    "conditions_to_improve": ["string"]
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice. Human review required before execution.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"confidence": 0.78, "validation": 0.75, "risk": 0.72, "verdict": 0.70},
  "recommended_actions_priority_order": ["human review before any execution", "paper_mode_recommended=true always", "pass verdict = do not trade"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
