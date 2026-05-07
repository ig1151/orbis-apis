import { Router, Request, Response } from 'express';
import { logger } from '../logger';

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
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try { return JSON.parse(data.choices[0].message.content ?? '{}'); }
  catch { return {}; }
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
    const quotes = entries.filter(([, v]: [string, unknown]) => v && !(v as Record<string, unknown>).code).map(([, v]: [string, unknown]) => v);
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
    const quotes = entries.filter(([, v]: [string, unknown]) => v && !(v as Record<string, unknown>).code).map(([, v]: [string, unknown]) => v);
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
      const quotes = entries.filter(([, v]: [string, unknown]) => v && !(v as Record<string, unknown>).code).map(([, v]: [string, unknown]) => {
        const q = v as Record<string, unknown>;
        return { ticker: q.symbol, price: parseFloat(q.close as string), change: parseFloat(q.change as string), changePct: q.percent_change, isMarketOpen: q.is_market_open };
      });
      write('pulse', { tickers: symbols, quotes, timestamp: new Date().toISOString() });

      // Fire webhooks on big moves
      for (const entry of webhookStore.values()) {
        if (entry.status !== 'active') continue;
        const triggered = quotes.filter(q => entry.tickers.includes(q.ticker) && Math.abs(parseFloat(q.changePct as string)) >= entry.alert_threshold);
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

export default router;
