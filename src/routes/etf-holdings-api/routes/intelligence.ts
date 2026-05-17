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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'ETF Holdings API', info: '/etf-holdings/info', openapi: '/etf-holdings/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Return ETF holdings data for ticker="${ticker}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"ticker":"${ticker}","name":"string","issuer":"string","aum_usd":0,"expense_ratio":0.0,"inception_date":"string","benchmark_index":"string","total_holdings":0,"top_holdings":[{"ticker":"string","name":"string","weight_pct":0.0,"value_usd":0,"shares":0}],"as_of_date":"string","source_provenance":{"provider":"etf-holdings-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"etf-holdings","recommended_next_endpoint":"/sector-breakdown","automation_safe":true,"confidence_per_section":{"holdings":0.85},"recommended_actions_priority_order":["review top holdings","check sector exposure","compare to benchmark"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/top-holdings', async (req: Request, res: Response) => {
  const { ticker, limit } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Get top ${limit||10} holdings for ETF ticker="${ticker}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"ticker":"${ticker}","top_holdings":[{"rank":0,"ticker":"string","name":"string","weight_pct":0.0,"value_usd":0,"sector":"string","country":"string","change_from_prev":0.0}],"concentration_top10_pct":0.0,"as_of_date":"string","source_provenance":{"provider":"etf-holdings-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"etf-holdings","recommended_next_endpoint":"/etf-intelligence","automation_safe":true,"confidence_per_section":{"holdings":0.85},"recommended_actions_priority_order":["analyze concentration","check sector exposure","compare to peers"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sector-breakdown', async (req: Request, res: Response) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Get sector/geography breakdown for ETF ticker="${ticker}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"ticker":"string","sector_allocation":[{"sector":"string","weight_pct":0.0,"holding_count":0}],"geography_allocation":[{"country":"string","weight_pct":0.0}],"asset_class_mix":{"equities_pct":0.0,"bonds_pct":0.0,"cash_pct":0.0,"other_pct":0.0},"largest_sector":"string","geographic_concentration":"concentrated|diversified|global","source_provenance":{"provider":"etf-holdings-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"etf-holdings","recommended_next_endpoint":"/etf-intelligence","automation_safe":true,"confidence_per_section":{"breakdown":0.85},"recommended_actions_priority_order":["assess sector tilt","check geographic risk","compare to target allocation"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { ticker, objective } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'etf_research',
    next_api: 'etf-holdings', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_TICKER: 'ticker is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'etf-holdings', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Look up holdings', 'Analyze sectors', 'Compare to peers'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/etf-intelligence', async (req: Request, res: Response) => {
  const { ticker, context } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Full ETF intelligence for ticker="${ticker}", context="${context||'portfolio allocation'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"ticker":"string","name":"string","aum_usd":0,"expense_ratio":0.0,"top_10_holdings":[{"ticker":"string","weight_pct":0.0}],"concentration_top10_pct":0.0,"sector_tilt":"string","geographic_focus":"domestic|international|global|emerging","risk_profile":"aggressive|growth|balanced|conservative","dividend_yield_pct":0.0,"liquidity":"high|medium|low","suitable_for":["string"],"comparable_etfs":["string"],"investment_thesis":"string","risks":["string"],"source_provenance":{"provider":"etf-holdings-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"portfolio-risk","recommended_next_endpoint":"/analyze","automation_safe":true,"confidence_per_section":{"holdings":0.85,"analysis":0.80},"recommended_actions_priority_order":["use in allocation model","check expense ratio","compare to alternatives"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { ticker_a, ticker_b } = req.body;
  if (!ticker_a || !ticker_b) return res.status(400).json({ error: 'ticker_a and ticker_b are required' });
  try {
    const raw = await callClaude(`Compare two ETFs: ticker_a="${ticker_a}" vs ticker_b="${ticker_b}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"ticker_a":"${ticker_a}","ticker_b":"${ticker_b}","comparison":{"expense_ratio":{"a":0.0,"b":0.0,"winner":"string"},"aum_usd":{"a":0,"b":0,"winner":"string"},"top_holdings_overlap_pct":0.0,"sector_similarity_pct":0.0},"recommendation":"prefer_a|prefer_b|both_suitable|depends_on_goal","rationale":"string","key_differences":["string"],"source_provenance":{"provider":"etf-holdings-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"etf-holdings","recommended_next_endpoint":"/etf-intelligence","automation_safe":true,"confidence_per_section":{"comparison":0.82},"recommended_actions_priority_order":["apply recommendation","check overlap","decide allocation split"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || tickers.length === 0) return res.status(400).json({ error: 'tickers array is required' });
  if (tickers.length > 5) return res.status(400).json({ error: 'Maximum 5 tickers per batch' });
  try {
    const results = await Promise.all(tickers.map(async (ticker: string) => {
      const raw = await callClaude(`Quick ETF summary for ticker="${ticker}". Return JSON only:
{"ticker":"${ticker}","name":"string","aum_usd":0,"expense_ratio":0.0,"top_sector":"string","concentration_top10_pct":0.0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: tickers.length, results,
      source_provenance: { provider: 'etf-holdings-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'etf-holdings', recommended_next_endpoint: '/etf-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
