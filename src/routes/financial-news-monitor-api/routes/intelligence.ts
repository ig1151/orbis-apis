import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Financial News Monitor API', info: '/financial-news-monitor/info', openapi: '/financial-news-monitor/openapi.json', health: 'ok' });
});

// POST /analyze-sentiment
router.post('/analyze-sentiment', async (req: Request, res: Response) => {
  const { articles, ticker, sector } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const raw = await callClaude(`Analyze financial news sentiment for investment signals.

Ticker filter: "${ticker || 'all'}", Sector filter: "${sector || 'all'}"
Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "overall_sentiment": "very_bullish|bullish|neutral|bearish|very_bearish",
  "sentiment_score": -100 to 100,
  "sentiment_by_ticker": [{ "ticker": "string", "sentiment": "bullish|neutral|bearish", "score": -100 to 100, "article_count": number }],
  "sentiment_by_sector": [{ "sector": "string", "sentiment": "bullish|neutral|bearish", "score": number }],
  "sentiment_shift": "improving|stable|deteriorating",
  "key_bullish_themes": ["string"],
  "key_bearish_themes": ["string"],
  "news_volume_signal": "high|normal|low",
  "market_moving_probability": "high|medium|low",
  "confidence_per_section": { "overall_sentiment": 0-1, "sentiment_by_ticker": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-tickers
router.post('/extract-tickers', async (req: Request, res: Response) => {
  const { articles } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const raw = await callClaude(`Extract all stock tickers, companies, and financial entities mentioned in these news articles.

Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "tickers": [{ "ticker": "string", "company_name": "string", "mention_count": number, "context": "positive|negative|neutral", "exchanges": ["string"] }],
  "primary_ticker": "string",
  "sector_mentions": [{ "sector": "string", "mention_count": number }],
  "index_mentions": ["string"],
  "macro_entities": ["string (Fed, ECB, Treasury etc)"],
  "commodities": ["string"],
  "total_tickers_found": number,
  "confidence_per_section": { "tickers": 0-1, "sector_mentions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /score-impact
router.post('/score-impact', async (req: Request, res: Response) => {
  const { article, ticker } = req.body;
  if (!article) return res.status(400).json({ error: 'article is required' });
  try {
    const raw = await callClaude(`Score the potential market impact of this financial news article.

Ticker: "${ticker || 'general market'}"
Article (first 4000 chars): "${String(article).slice(0, 4000)}"

Return JSON:
{
  "impact_score": 0-100,
  "impact_level": "very_high|high|medium|low|minimal",
  "price_direction": "up|down|sideways|uncertain",
  "magnitude_estimate_pct": number,
  "time_horizon": "intraday|1-3 days|1-2 weeks|longer-term",
  "catalyst_type": "earnings|guidance|macro|regulatory|M&A|analyst|insider|sector",
  "affected_tickers": ["string"],
  "affected_sectors": ["string"],
  "counterpoints": ["string (factors that could reduce impact)"],
  "trade_signal": "buy|sell|hold|avoid",
  "confidence_per_section": { "impact_score": 0-1, "price_direction": 0-1, "trade_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-events
router.post('/detect-events', async (req: Request, res: Response) => {
  const { articles } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const raw = await callClaude(`Detect significant financial events, catalysts, and breaking developments in these news articles.

Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "events": [{ "event": "string", "type": "earnings|M&A|regulatory|macro|leadership|guidance|lawsuit|product|partnership", "tickers_affected": ["string"], "significance": "high|medium|low", "sentiment": "positive|negative|neutral", "confirmed": true|false, "summary": "string" }],
  "breaking_events": ["string"],
  "scheduled_events": [{ "event": "string", "date": "string", "tickers": ["string"] }],
  "rumor_events": ["string"],
  "total_events": number,
  "market_moving_events": ["string"],
  "confidence_per_section": { "events": 0-1, "breaking_events": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trending-topics
router.post('/trending-topics', async (req: Request, res: Response) => {
  const { articles, timeframe = '24h' } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const raw = await callClaude(`Identify trending financial topics, themes, and narratives in these news articles.

Timeframe: "${timeframe}"
Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "trending_topics": [{ "topic": "string", "mention_count": number, "sentiment": "bullish|neutral|bearish", "related_tickers": ["string"], "momentum": "rising|stable|fading" }],
  "dominant_narrative": "string",
  "emerging_themes": ["string"],
  "fading_themes": ["string"],
  "macro_themes": ["string"],
  "sector_themes": [{ "sector": "string", "theme": "string", "sentiment": "bullish|neutral|bearish" }],
  "narrative_shift": true|false,
  "confidence_per_section": { "trending_topics": 0-1, "dominant_narrative": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare-sources
router.post('/compare-sources', async (req: Request, res: Response) => {
  const { articles, topic } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const raw = await callClaude(`Compare coverage and sentiment across different news sources for this financial topic.

Topic: "${topic || 'general'}"
Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "sources": [{ "source": "string", "article_count": number, "sentiment": "bullish|neutral|bearish", "bias_direction": "optimistic|neutral|pessimistic", "credibility_tier": "tier1|tier2|tier3" }],
  "consensus_view": "bullish|neutral|bearish",
  "divergent_views": ["string (sources with contrarian takes)"],
  "sentiment_dispersion": "high|medium|low",
  "most_cited_source": "string",
  "contrarian_signals": ["string"],
  "information_gaps": ["string (what sources are missing)"],
  "confidence_per_section": { "sources": 0-1, "consensus_view": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { articles, ticker } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  const articleCount = Array.isArray(articles) ? articles.length : 1;
  res.json({
    execution_ready: articleCount > 0,
    ticker: ticker || 'all',
    article_count: articleCount,
    recommended_endpoint: articleCount > 5 ? '/analyze-sentiment' : '/score-impact',
    next_api: 'portfolio-risk',
    next_endpoint: '/score-risk',
    blocking_flags: articleCount === 0 ? ['NO_ARTICLES'] : [],
    flag_definitions: { NO_ARTICLES: 'No articles provided — cannot analyze empty input' },
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /monitor (ONE-CALL)
router.post('/monitor', async (req: Request, res: Response) => {
  const { articles, ticker, portfolio_tickers } = req.body;
  if (!articles) return res.status(400).json({ error: 'articles is required' });
  try {
    const articlesStr = typeof articles === 'string' ? articles : JSON.stringify(articles).slice(0, 4000);
    const tickerFilter = ticker || (portfolio_tickers ? portfolio_tickers.join(', ') : 'all');
    const raw = await callClaude(`ONE-CALL financial news monitor. Analyze sentiment, extract tickers, detect events, score market impact, and generate trading signals.

Ticker focus: "${tickerFilter}"
Articles (first 4000 chars): "${articlesStr.slice(0, 4000)}"

Return JSON:
{
  "overall_sentiment": "very_bullish|bullish|neutral|bearish|very_bearish",
  "sentiment_score": -100 to 100,
  "top_tickers": [{ "ticker": "string", "sentiment": "bullish|neutral|bearish", "impact": "high|medium|low" }],
  "breaking_events": ["string"],
  "dominant_narrative": "string",
  "market_moving_news": ["string"],
  "trading_signals": [{ "ticker": "string", "signal": "buy|sell|hold|avoid", "rationale": "string", "confidence": 0-1 }],
  "risk_flags": ["string"],
  "watch_list_additions": ["string"],
  "sentiment_shift": "improving|stable|deteriorating",
  "one_line_summary": "string",
  "confidence_per_section": { "overall_sentiment": 0-1, "trading_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['news:read', 'news:analyze', 'news:monitor'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const violations: string[] = trust_score < 0.3 ? ['trust_score_below_threshold'] : [];
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode: trust_score < 0.5, violations, scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, execution_id: req.params.execution_id, events: eventStore[req.params.execution_id] || [], total: (eventStore[req.params.execution_id] || []).length, computed_at: new Date().toISOString() });
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked' }), success: gov.permitted, ...gov, required_scopes: REQUIRED_SCOPES, computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, audit_trail: execution_id ? (eventStore[execution_id] || []) : [], agent_id: gov.agent_id, trust_score: gov.trust_score, computed_at: new Date().toISOString() });
});
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps } = req.body || {};
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultSteps = ['ingest_articles', 'extract_tickers', 'analyze_sentiment', 'detect_events', 'generate_signals'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'monitor financial news', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
  const wf = workflowStore[id];
  res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; }
  wf.updated_at = new Date().toISOString();
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() });
});

export default router;
