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
  res.json({ name: 'Stablecoin Depeg Risk API', openapi: '/stablecoin-depeg/openapi.json', health: 'ok' });
});

// POST /check
router.post('/check', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Stablecoin depeg risk analysis for: "${symbol}" as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "peg": {
    "target": number (e.g. 1.00),
    "current_price": number,
    "deviation_pct": number,
    "deviation_direction": "above|below|on_peg",
    "is_depegged": boolean,
    "depeg_threshold_pct": 0.5
  },
  "risk": {
    "score": number (0-100),
    "level": "low|medium|high|critical",
    "collateral_ratio": number or null,
    "collateral_type": "fiat-backed|crypto-backed|algorithmic|hybrid",
    "reserve_transparency": "high|medium|low|unknown",
    "audit_status": "audited|unaudited|partial"
  },
  "history": {
    "largest_depeg_30d_pct": number,
    "depeg_events_90d": number,
    "days_since_last_depeg": number or null
  },
  "recommendation": "safe|monitor|reduce_exposure|exit",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"peg": 0.88, "risk": 0.82, "history": 0.75},
  "recommended_actions_priority_order": ["exit if risk is critical", "monitor deviation hourly if medium risk", "verify reserve proof before large holdings"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /monitor (batch)
router.post('/monitor', async (req: Request, res: Response) => {
  const { symbols } = req.body;
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) return res.status(400).json({ error: 'symbols array is required' });
  if (symbols.length > 20) return res.status(400).json({ error: 'maximum 20 symbols per request' });
  try {
    const raw = await callClaude(`Depeg risk monitoring for stablecoins: ${symbols.join(', ')} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "total": ${symbols.length},
  "results": [
    {
      "symbol": "string",
      "current_price": number,
      "deviation_pct": number,
      "risk_level": "low|medium|high|critical",
      "recommendation": "safe|monitor|reduce_exposure|exit",
      "is_depegged": boolean
    }
  ],
  "alerts": ["string (any symbols with high/critical risk)"],
  "market_health": "stable|stressed|crisis",
  "confidence_per_section": {"results": 0.85, "alerts": 0.88},
  "recommended_actions_priority_order": ["act on critical alerts immediately", "monitor high risk hourly", "safe symbols need no action"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full stablecoin depeg intelligence for: "${symbol}" as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol.toUpperCase()}",
  "peg": {"target": number, "current_price": number, "deviation_pct": number, "is_depegged": boolean},
  "risk": {"score": number, "level": "low|medium|high|critical", "collateral_type": "string", "reserve_transparency": "string"},
  "history": {"largest_depeg_30d_pct": number, "depeg_events_90d": number},
  "issuer": {"name": "string", "jurisdiction": "string", "regulated": boolean},
  "market": {"market_cap_usd": number, "volume_24h_usd": number, "rank_among_stablecoins": number},
  "recommendation": "safe|monitor|reduce_exposure|exit",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"peg": 0.88, "risk": 0.82, "history": 0.75, "market": 0.85},
  "recommended_actions_priority_order": ["check peg deviation before holding", "verify collateral for large positions", "monitor history for pattern risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
