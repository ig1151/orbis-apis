import { Router, Request, Response } from 'express';
import { logger } from '../logger';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.01;
  return {
    trace_id, execution_id, session_id, request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || { total_ms: 0, inference_ms: 0, io_ms: 0, overhead_ms: 0 },
    cost_breakdown:    overrides.cost_breakdown    || {
      total_usd:     unit,
      inference_usd: Math.round(unit * 0.70 * 1e6) / 1e6,
      io_usd:        Math.round(unit * 0.15 * 1e6) / 1e6,
      overhead_usd:  Math.round(unit * 0.15 * 1e6) / 1e6,
    },
    provenance: overrides.provenance || {
      api_version: '1.0.0', model: 'orbis-inference-v1',
      data_sources: [], computed_at: new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts: 3, backoff_strategy: 'exponential',
      backoff_base_ms: 500, safe_to_retry: true, idempotency_key: request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: req.body?.parent_execution || req.headers?.['x-parent-execution'] || null,
      triggered_by:     req.body?.triggered_by     || req.headers?.['x-triggered-by']     || null,
      downstream: [], dag_id: req.body?.dag_id || req.headers?.['x-dag-id'] || null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain: true, suggested_next: [], requires_review: false,
    },
  };
}


const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';
const TWELVE_BASE = 'https://api.twelvedata.com';

// ── Shared helpers ────────────────────────────────────────────────────────────
async function twelveGet(path: string): Promise<Record<string, unknown>> {
  const key = process.env.TWELVE_DATA_API_KEY ?? '';
  const res = await fetch(`${TWELVE_BASE}${path}&apikey=${key}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function getQuote(ticker: string) {
  const d = await twelveGet(`/quote?symbol=${ticker}`);
  if (d.status === 'error' || d.code) throw new Error((d.message as string) || 'Ticker not found');
  return {
    ticker: d.symbol, name: d.name, exchange: d.exchange,
    price: parseFloat(d.close as string),
    open: parseFloat(d.open as string),
    high: parseFloat(d.high as string),
    low: parseFloat(d.low as string),
    previousClose: parseFloat(d.previous_close as string),
    change: parseFloat(d.change as string),
    changePct: d.percent_change,
    volume: parseInt(d.volume as string),
    isMarketOpen: d.is_market_open,
  };
}

async function callClaude(prompt: string, maxTokens = 1200): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],

    }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Claude parse error:', data.choices[0].message.content?.slice(0, 200));
    return { raw: data.choices[0].message.content };
  }
}

// ── Webhook store ─────────────────────────────────────────────────────────────
interface WatchlistWebhook {
  id: string; tickers: string[]; webhook_url: string;
  alert_threshold: number; created_at: string;
  status: 'active' | 'cancelled'; trigger_count: number;
}
const webhookStore = new Map<string, WatchlistWebhook>();

// ── POST /score-ticker ────────────────────────────────────────────────────────
router.post('/score-ticker', async (req: Request, res: Response) => {
  const { ticker, context } = req.body;
  if (!ticker) { res.status(400).json({ error: 'Provide ticker' }); return; }
  const start = Date.now();
  try {
    const quote = await getQuote(ticker.toUpperCase());
    const data = await callClaude(`You are a stock market signal scoring engine. Score this ticker based on current market data and return ONLY a valid JSON object with these keys:
- signal_score: number (0-100, higher = stronger buy signal)
- momentum: string (strong_up | up | neutral | down | strong_down)
- volatility: string (high | medium | low)
- volume_signal: string (high | normal | low)
- trend: string (bullish | bearish | neutral | mixed)
- confidence: number (0-1)
- key_signals: array of strings
- recommended_action: string (buy | hold | sell | watch | avoid)
- risk_level: string (high | medium | low)
${context ? `Context: ${context}` : ''}
Market data: ${JSON.stringify(quote)}
Return only the JSON object:`);
    res.json({ endpoint: 'score-ticker', ticker: ticker.toUpperCase(), quote, intelligence: data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'score-ticker', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /detect-market-event
// Alias: POST /score → /score-ticker
router.post('/score', async (req: Request, res: Response) => {
  const { ticker, context } = req.body;
  if (!ticker) { res.status(400).json({ error: 'Provide ticker' }); return; }
  const start = Date.now();
  try {
    const quote = await getQuote(ticker.toUpperCase());
    const data = await callClaude(`You are a stock market signal scoring engine. Score this ticker and return ONLY valid JSON with keys: signal_score (0-100), momentum, volatility, volume_signal, trend, confidence (0-1), key_signals (array), recommended_action, risk_level. Market data: ${JSON.stringify(quote)}. Return only the JSON object:`);
    res.json({ endpoint: 'score', ticker: ticker.toUpperCase(), quote, intelligence: data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    res.status(500).json({ error: message });
  }
});

// ── POST /detect-market-event ─────────────────────────────────────────────────
router.post('/detect-market-event', async (req: Request, res: Response) => {
  const { ticker, context } = req.body;
  if (!ticker) { res.status(400).json({ error: 'Provide ticker' }); return; }
  const start = Date.now();
  try {
    const quote = await getQuote(ticker.toUpperCase());
    const changePct = parseFloat(quote.changePct as string);
    const data = await callClaude(`You are a market event detection engine. Analyze this ticker's current data and detect any significant market events. Return ONLY a valid JSON object with these keys:
- event_detected: boolean
- event_type: string (earnings_move | gap_up | gap_down | volume_spike | breakout | breakdown | reversal | consolidation | none)
- severity: string (critical | high | medium | low | none)
- alert_level: string (high | medium | low | none)
- description: string
- signals: array of strings
- recommended_response: string
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Market data: ${JSON.stringify({ ...quote, changePct_numeric: changePct })}
Return only the JSON object:`);
    res.json({ endpoint: 'detect-market-event', ticker: ticker.toUpperCase(), quote, event: data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'detect-market-event', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /rank-watchlist ──────────────────────────────────────────────────────
router.post('/rank-watchlist', async (req: Request, res: Response) => {
  const { tickers, criteria } = req.body;
  if (!tickers || !Array.isArray(tickers)) { res.status(400).json({ error: 'Provide tickers array' }); return; }
  const start = Date.now();
  try {
    const symbols = tickers.slice(0, 20).join(',');
    const d = await twelveGet(`/quote?symbol=${symbols}`);
    const entries = tickers.length === 1 ? [[tickers[0], d]] : Object.entries(d);
    const quotes = entries.filter((e: any) => e[1] && !e[1].code).map((e: any) => e[1]);
    const data = await callClaude(`You are a watchlist ranking engine. Rank these stocks by signal strength and return ONLY a valid JSON object with these keys:
- ranked: array of {rank, ticker, name, price, changePct, signal_score (0-100), momentum, recommendation (buy|hold|sell|watch), reason}
- top_pick: string (ticker of best opportunity)
- avoid: string (ticker to avoid)
- market_summary: string (1-2 sentences on overall watchlist health)
${criteria ? `Ranking criteria: ${criteria}` : 'Rank by overall signal strength and momentum'}
Stocks data: ${JSON.stringify(quotes)}
Return only the JSON object:`, 1500);
    res.json({ endpoint: 'rank-watchlist', tickers, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'rank-watchlist', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /portfolio-risk ──────────────────────────────────────────────────────
router.post('/portfolio-risk', async (req: Request, res: Response) => {
  const { holdings, context } = req.body;
  if (!holdings || !Array.isArray(holdings)) { res.status(400).json({ error: 'Provide holdings array of {ticker, shares, avg_cost}' }); return; }
  const start = Date.now();
  try {
    const tickers = holdings.map((h: Record<string, unknown>) => h.ticker as string).join(',');
    const d = await twelveGet(`/quote?symbol=${tickers}`);
    const entries = holdings.length === 1 ? [[holdings[0].ticker, d]] : Object.entries(d);
    const enriched = holdings.map((h: Record<string, unknown>) => {
      const quote = entries.find(([k]) => k === h.ticker)?.[1] as Record<string, unknown> ?? {};
      const currentPrice = parseFloat((quote.close ?? 0) as string);
      const value = currentPrice * (h.shares as number);
      const pnl = (currentPrice - (h.avg_cost as number)) * (h.shares as number);
      const pnlPct = ((currentPrice - (h.avg_cost as number)) / (h.avg_cost as number)) * 100;
      return { ...h, current_price: currentPrice, current_value: value, unrealized_pnl: pnl, unrealized_pnl_pct: pnlPct.toFixed(2) + '%', change: quote.change, changePct: quote.percent_change };
    });
    const data = await callClaude(`You are a portfolio risk analysis engine. Analyze this portfolio and return ONLY a valid JSON object with these keys:
- overall_risk: string (high | medium | low)
- risk_score: number (0-100, higher = more risk)
- concentration_risk: string (high | medium | low)
- diversification_score: number (0-100)
- total_value: number
- total_pnl: number
- holdings_analysis: array of {ticker, risk_contribution, recommendation (hold|reduce|add|exit)}
- biggest_risk: string (description of main risk)
- recommended_actions: array of strings
- alert_level: string (high | medium | low)
${context ? `Context: ${context}` : ''}
Portfolio: ${JSON.stringify(enriched)}
Return only the JSON object:`, 1500);
    res.json({ endpoint: 'portfolio-risk', holdings: enriched, risk_analysis: data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'portfolio-risk', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /monitor-watchlist ───────────────────────────────────────────────────
router.post('/monitor-watchlist', async (req: Request, res: Response) => {
  const { tickers, alert_threshold, context } = req.body;
  if (!tickers || !Array.isArray(tickers)) { res.status(400).json({ error: 'Provide tickers array' }); return; }
  const start = Date.now();
  try {
    const symbols = tickers.slice(0, 20).join(',');
    const d = await twelveGet(`/quote?symbol=${symbols}`);
    const entries = tickers.length === 1 ? [[tickers[0], d]] : Object.entries(d);
    const quotes = entries.filter((e: any) => e[1] && !e[1].code).map((e: any) => e[1]);
    const threshold = alert_threshold ?? 2;
    const data = await callClaude(`You are a watchlist monitoring engine. Monitor these stocks and surface alerts. Return ONLY a valid JSON object with these keys:
- alerts: array of {ticker, alert_type, severity (high|medium|low), message, action}
- movers: array of {ticker, changePct, direction (up|down), signal}
- alert_count: number
- high_priority_count: number
- market_pulse: string (overall market sentiment in 1 sentence)
- recommended_action: string
Alert threshold: ${threshold}% change
${context ? `Context: ${context}` : ''}
Stocks: ${JSON.stringify(quotes)}
Return only the JSON object:`);
    res.json({ endpoint: 'monitor-watchlist', tickers, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-watchlist', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { ticker, action, context, signal_threshold } = req.body;
  if (!ticker || !action) { res.status(400).json({ error: 'Provide ticker and action (buy|sell|hold)' }); return; }
  const start = Date.now();
  try {
    const quote = await getQuote(ticker.toUpperCase());
    const threshold = signal_threshold ?? 60;
    const data = await callClaude(`You are a market execution gate. Determine whether the requested action should be executed based on current market data. Return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- signal_score: number (0-100)
- risk_level: string (high | medium | low)
- alert_level: string (high | medium | low | none)
- blocking_flags: array of strings (reasons NOT to execute)
- market_conditions: string (favorable | neutral | unfavorable)
- recommended_action: string
- next_api: string
- next_endpoint: string
Requested action: ${action}
Signal threshold: ${threshold}
${context ? `Context: ${context}` : ''}
Market data: ${JSON.stringify(quote)}
Return only the JSON object:`);
    const result = data as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      ticker: ticker.toUpperCase(),
      action,
      execution_ready: result.execute === true,
      next_api: result.next_api ?? 'autopilot',
      next_endpoint: result.next_endpoint ?? '/should-execute',
      data: result,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.004, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /register-webhook ────────────────────────────────────────────────────
router.post('/register-webhook', (req: Request, res: Response) => {
  const { tickers, webhook_url, alert_threshold } = req.body;
  if (!tickers || !webhook_url) { res.status(400).json({ error: 'Provide tickers and webhook_url' }); return; }
  const id = `mwh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: WatchlistWebhook = {
    id, tickers: Array.isArray(tickers) ? tickers : [tickers],
    webhook_url, alert_threshold: alert_threshold ?? 2,
    created_at: new Date().toISOString(), status: 'active', trigger_count: 0,
  };
  webhookStore.set(id, entry);
  res.json({
    endpoint: 'register-webhook', id,
    tickers: entry.tickers, webhook_url,
    alert_threshold: entry.alert_threshold,
    status: 'active',
    message: 'Webhook registered. Will fire when any ticker moves beyond alert_threshold%.',
    registered_at: entry.created_at,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /stream ───────────────────────────────────────────────────────────────
router.get('/stream', (req: Request, res: Response) => {
  const { tickers, interval_ms } = req.query as { tickers?: string; interval_ms?: string };
  if (!tickers) { res.status(400).json({ error: 'Provide tickers as query param' }); return; }
  const symbols = tickers.split(',').map(t => t.trim().toUpperCase());
  const intervalMs = Math.max(parseInt(interval_ms ?? '15000', 10), 10000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const write = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as unknown as { flush?: () => void }).flush?.();
  };

  write('connected', { tickers: symbols, interval_ms: intervalMs, timestamp: new Date().toISOString() });

  const timer = setInterval(async () => {
    try {
      const symbolStr = symbols.join(',');
      const d = await twelveGet(`/quote?symbol=${symbolStr}`);
      const entries = symbols.length === 1 ? [[symbols[0], d]] : Object.entries(d);
      const quotes = entries.filter((e: any) => e[1] && !e[1].code).map((e: any) => { const v = e[1] as Record<string, unknown>;
        const q = v as Record<string, unknown>;
        return { ticker: q.symbol, price: parseFloat(q.close as string), change: parseFloat(q.change as string), changePct: q.percent_change, isMarketOpen: q.is_market_open };
      });
      write('pulse', { tickers: symbols, quotes, timestamp: new Date().toISOString() });

      // Fire webhooks on big moves
      for (const entry of webhookStore.values()) {
        if (entry.status !== 'active') continue;
        const triggered = quotes.filter(q => entry.tickers.includes(q.ticker as string) && Math.abs(parseFloat(String(q.changePct ?? 0))) >= entry.alert_threshold);
        if (triggered.length > 0) {
          entry.trigger_count++;
          fetch(entry.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'price_alert', triggered, timestamp: new Date().toISOString() }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      write('error', { message: 'Pulse failed', timestamp: new Date().toISOString() });
    }
  }, intervalMs);

  req.on('close', () => { clearInterval(timer); });
});

// ── POST /monitor-status ──────────────────────────────────────────────────────
router.post('/monitor-status', (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) { res.status(400).json({ error: 'Provide id' }); return; }
  const entry = webhookStore.get(id);
  if (!entry) { res.status(404).json({ error: 'Monitor not found' }); return; }
  res.json({ endpoint: 'monitor-status', ...entry, timestamp: new Date().toISOString() });
});

// ── POST /monitor-cancel ──────────────────────────────────────────────────────
router.post('/monitor-cancel', (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) { res.status(400).json({ error: 'Provide id' }); return; }
  const entry = webhookStore.get(id);
  if (!entry) { res.status(404).json({ error: 'Monitor not found' }); return; }
  entry.status = 'cancelled';
  res.json({ endpoint: 'monitor-cancel', id, status: 'cancelled', timestamp: new Date().toISOString() });
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
