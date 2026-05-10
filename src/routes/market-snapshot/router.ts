import { Router, Request, Response } from 'express';

const router = Router();

const TWELVE_BASE = 'https://api.twelvedata.com';

async function twelveGet(path: string): Promise<Record<string, unknown>> {
  const key = process.env.TWELVE_DATA_API_KEY ?? '';
  const res = await fetch(`${TWELVE_BASE}${path}&apikey=${key}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

function parseQuote(d: Record<string, unknown>, symbol: string) {
  if (d.status === 'error' || d.code) throw new Error((d.message as string) || `Ticker not found: ${symbol}`);
  return {
    symbol: d.symbol,
    name: d.name,
    exchange: d.exchange,
    currency: d.currency,
    price: parseFloat(d.close as string),
    open: parseFloat(d.open as string),
    high: parseFloat(d.high as string),
    low: parseFloat(d.low as string),
    previous_close: parseFloat(d.previous_close as string),
    change: parseFloat(d.change as string),
    change_pct: d.percent_change,
    volume: parseInt(d.volume as string),
    is_market_open: d.is_market_open,
    fifty_two_week: d.fifty_two_week ?? null,
    timestamp: new Date().toISOString(),
  };
}

// GET /quote?symbol=AAPL

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Snapshot API',
      version: '1.0.0',
      description: 'Real-time stock market quotes, watchlists, search, and execution gating for autonomous agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/quote': 0.001, '/watchlist': 0.002, '/search': 0.001, '/compare': 0.002, '/execution-gate': 0.002 },
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-snapshot' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/quote': {
        get: { operationId: 'getQuote', summary: 'Get real-time stock quote', 'x-agent-callable': true,
          parameters: [{ name: 'symbol', in: 'query', required: true, schema: { type: 'string' }, description: 'Ticker(s) e.g. AAPL or AAPL,MSFT' }],
          responses: { '200': { description: 'Quote data', content: { 'application/json': { schema: { type: 'object', properties: {
            success: { type: 'boolean' }, data: { type: 'object', properties: {
              symbol: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' },
              change: { type: 'number' }, change_pct: { type: 'string' }, volume: { type: 'number' },
              is_market_open: { type: 'boolean' }, confidence_per_section: { type: 'object' },
            }}, latency_ms: { type: 'number' },
          }}}}}}},
        post: { operationId: 'postQuote', summary: 'Get quote via POST', 'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
            symbol: { type: 'string' }, symbols: { type: 'array', items: { type: 'string' } },
          }}}}},
          responses: { '200': { description: 'Quote data' } }},
      },
      '/watchlist': { get: { operationId: 'getWatchlist', summary: 'Get quotes for multiple tickers', 'x-agent-callable': true,
        parameters: [{ name: 'symbols', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Watchlist quotes' } }}},
      '/search': { get: { operationId: 'searchSymbol', summary: 'Search for ticker symbols', 'x-agent-callable': true,
        parameters: [{ name: 'query', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Search results' } }}},
      '/compare': { post: { operationId: 'compareSymbols', summary: 'Compare multiple tickers side by side', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: {
          symbols: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 },
        }}}}},
        responses: { '200': { description: 'Comparison with winner and rankings' } }}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate trading actions based on market conditions', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'action'], properties: {
          symbol: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
          threshold_pct: { type: 'number', default: 3 },
        }}}}},
        responses: { '200': { description: 'Execution gate decision with execute bool and chain_to' } }}},
      '/health': { get: { operationId: 'health', summary: 'Health check', responses: { '200': { description: 'OK' } }}},
    },
  });
});

router.get('/quote', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string || '').toUpperCase().trim();
  if (!symbol) { res.status(400).json({ error: 'Provide symbol as query param, e.g. /quote?symbol=AAPL' }); return; }
  const start = Date.now();
  try {
    const symbols = symbol.split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length === 1) {
      const d = await twelveGet(`/quote?symbol=${symbols[0]}`);
      const quote = parseQuote(d, symbols[0]);
      res.json({ success: true, data: quote, latency_ms: Date.now() - start });
    } else {
      const d = await twelveGet(`/quote?symbol=${symbols.join(',')}`);
      const quotes: Record<string, unknown> = {};
      for (const sym of symbols) {
        try {
          const entry = (d[sym] ?? d) as Record<string, unknown>;
          quotes[sym] = parseQuote(entry, sym);
        } catch (e: any) {
          quotes[sym] = { error: e.message };
        }
      }
      res.json({ success: true, count: symbols.length, data: quotes, latency_ms: Date.now() - start });
    }
  } catch (err: any) {
    const msg = err.message || 'Failed';
    if (msg.includes('not found') || msg.includes('404')) { res.status(404).json({ error: 'Ticker not found', message: msg }); return; }
    res.status(500).json({ error: 'Failed to fetch quote', message: msg });
  }
});

// POST /quote
router.post('/quote', async (req: Request, res: Response) => {
  const sym = req.body?.symbol || (req.body?.symbols ? req.body.symbols.join(',') : '');
  if (!sym) { res.status(400).json({ error: 'Provide symbol or symbols in request body' }); return; }
  req.query = { ...req.query, symbol: sym.toUpperCase() };
  return (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});

// GET /watchlist?symbols=AAPL,MSFT
router.get('/watchlist', async (req: Request, res: Response) => {
  const symbols = (req.query.symbols as string || '').toUpperCase().trim();
  if (!symbols) { res.status(400).json({ error: 'Provide symbols as comma-separated query param' }); return; }
  req.query = { ...req.query, symbol: symbols };
  return (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});

// GET /search?query=apple
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.query as string || '').trim();
  if (!query) { res.status(400).json({ error: 'Provide query as query param' }); return; }
  const start = Date.now();
  try {
    const key = process.env.TWELVE_DATA_API_KEY ?? '';
    const r = await fetch(`https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${key}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json() as Record<string, unknown>;
    const results = (d.data as any[] || []).slice(0, 10).map((r: any) => ({
      symbol: r.symbol, name: r.instrument_name, exchange: r.exchange,
      type: r.instrument_type, currency: r.currency,
    }));
    res.json({ success: true, query, count: results.length, data: results, latency_ms: Date.now() - start });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// GET /health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'market-snapshot', timestamp: new Date().toISOString() });
});

export default router;
