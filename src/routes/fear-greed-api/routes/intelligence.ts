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
  res.json({ name: 'Fear & Greed Index API', openapi: '/fear-greed/openapi.json', health: 'ok' });
});

// POST /current
router.post('/current', async (req: Request, res: Response) => {
  const { asset = 'crypto' } = req.body;
  try {
    const raw = await callClaude(`Current Fear & Greed Index for ${asset} markets as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "index": {
    "value": number (0-100),
    "label": "Extreme Fear|Fear|Neutral|Greed|Extreme Greed",
    "previous_day": number,
    "previous_week": number,
    "previous_month": number,
    "change_24h": number,
    "trend": "improving|deteriorating|stable"
  },
  "drivers": [
    {"factor": "string", "weight_pct": number, "current_reading": "string", "sentiment": "bearish|neutral|bullish"}
  ],
  "market_context": "string (1-2 sentence interpretation)",
  "signal": "strong_buy|buy|neutral|sell|strong_sell",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"index": 0.82, "drivers": 0.78},
  "recommended_actions_priority_order": ["use as macro sentiment filter", "combine with on-chain signals", "avoid trading extremes without confirmation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /history
router.post('/history', async (req: Request, res: Response) => {
  const { days = 30, asset = 'crypto' } = req.body;
  try {
    const raw = await callClaude(`Fear & Greed Index history for ${asset} markets, last ${days} days as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "period_days": ${days},
  "history": [
    {"date": "YYYY-MM-DD", "value": number, "label": "string"}
  ],
  "summary": {
    "avg_value": number,
    "avg_label": "string",
    "days_in_fear": number,
    "days_in_greed": number,
    "min_value": number,
    "max_value": number,
    "current_streak": "string (e.g. 5 days of Fear)"
  },
  "confidence_per_section": {"history": 0.78, "summary": 0.82},
  "recommended_actions_priority_order": ["identify market cycle phase", "compare extremes vs price action", "use streaks for contrarian signals"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { asset = 'crypto' } = req.body;
  try {
    const raw = await callClaude(`Full Fear & Greed intelligence for ${asset} markets as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "asset": "${asset}",
  "index": {"value": number, "label": "string", "previous_day": number, "previous_week": number, "trend": "improving|deteriorating|stable"},
  "drivers": [{"factor": "string", "weight_pct": number, "sentiment": "bearish|neutral|bullish"}],
  "30d_summary": {"avg_value": number, "days_in_fear": number, "days_in_greed": number, "current_streak": "string"},
  "market_context": "string",
  "signal": "strong_buy|buy|neutral|sell|strong_sell",
  "contrarian_opportunity": true or false,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"index": 0.82, "drivers": 0.78, "summary": 0.80},
  "recommended_actions_priority_order": ["use as macro filter before any trade", "extreme fear = watch for reversal", "extreme greed = tighten stops"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
