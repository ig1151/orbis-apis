import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alpha Signal API v2 — Docs</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0f0f0f; color: #e0e0e0; }
    h1 { color: #f59e0b; } h2 { color: #fbbf24; border-bottom: 1px solid #222; padding-bottom: 6px; margin-top: 40px; }
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: #34d399; }
    pre { background: #1a1a1a; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; }
    .method { background: #1d4ed8; color: #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 8px; }
    .post { background: #065f46 !important; color: #6ee7b7 !important; }
    .endpoint { margin: 24px 0; padding: 16px; border: 1px solid #222; border-radius: 8px; }
    .badge { background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; margin-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    td, th { padding: 8px 12px; border: 1px solid #333; text-align: left; font-size: 0.9em; }
    th { background: #1a1a1a; color: #fbbf24; }
    .loop { background: #1c1917; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>⚡ Alpha Signal API <span style="font-size:0.5em;color:#6ee7b7;vertical-align:middle">v2.0.0</span></h1>
  <p>Real-time trading signal engine for autonomous agents. Structured, machine-readable outputs designed for continuous polling loops, decision engines, and execution pipelines.</p>
  <p><strong>Base URL:</strong> <code>https://orbis-apis.onrender.com/alpha-signal</code></p>

  <div class="loop">
    🔁 <strong>Agent Loop Pattern:</strong>
    POST /scan-signals (every 1–5 min) → POST /score-asset (per hit) → POST /detect-event (if score &gt; 0.7) → POST /rank-opportunities → feed execution API
  </div>

  <h2>Supported Symbols</h2>
  <p><code>BTC ETH BNB SOL AVAX ARB OP MATIC LINK UNI AAVE CRV MKR SNX INJ TIA JUP WIF BONK PENDLE</code></p>

  <h2>Core Endpoints</h2>

  <div class="endpoint">
    <p><span class="method post">POST</span><code>/scan-signals</code> <span class="badge">CORE LOOP</span></p>
    <p>Scan multiple assets for live trading signals. Call every 1–5 minutes in agent loops.</p>
    <pre>{
  "symbols": ["ETH", "SOL", "BTC"],
  "timeframe": "5m",
  "min_confidence": 0.7,
  "signal_types": ["breakout", "momentum"]
}</pre>
    <pre>{
  "signals": [{
    "symbol": "ETH",
    "signal_type": "breakout",
    "action": "buy",
    "confidence": 0.87,
    "urgency": "high",
    "entry_zone": { "low": 3180, "high": 3220 },
    "stop_loss": 3100,
    "take_profit": 3400,
    "timeframe": "5m",
    "trend": "bullish",
    "volatility": 0.62,
    "volume_signal": "rising",
    "reasoning": "Price breaking above 24h high on rising volume",
    "price_usd": 3205.40,
    "timestamp": "2025-01-15T10:30:00Z"
  }],
  "count": 1,
  "timeframe": "5m",
  "scanned": 3,
  "next_poll_ms": 300000
}</pre>
  </div>

  <div class="endpoint">
    <p><span class="method post">POST</span><code>/score-asset</code></p>
    <p>Composite scoring for a single asset. Use inside decision loops after a scan hit.</p>
    <pre>{ "symbol": "ETH", "include_news": false }</pre>
    <pre>{
  "symbol": "ETH",
  "composite_score": 0.78,
  "trend_score": 0.82,
  "momentum_score": 0.75,
  "volume_score": 0.71,
  "sentiment_score": 0.68,
  "trend": "bullish",
  "volatility": 0.54,
  "regime": "trending",
  "bias": "long",
  "strength": "strong",
  "risk_rating": "medium",
  "price_usd": 3205.40
}</pre>
  </div>

  <div class="endpoint">
    <p><span class="method post">POST</span><code>/detect-event</code></p>
    <p>Detect significant market events. Returns chain_to hints for downstream API calls.</p>
    <pre>{ "symbol": "SOL", "include_news": true }</pre>
    <pre>{
  "symbol": "SOL",
  "event_detected": true,
  "event_type": "volume_spike",
  "impact_score": 0.84,
  "direction": "bullish",
  "urgency": "high",
  "confidence": 0.79,
  "price_level": 185.20,
  "description": "Unusual volume 3x above 7d average with upward price pressure",
  "chain_to": ["score-asset", "scan-signals", "rank-opportunities"]
}</pre>
  </div>

  <div class="endpoint">
    <p><span class="method post">POST</span><code>/rank-opportunities</code> <span class="badge">PREMIUM</span></p>
    <p>Rank assets by opportunity score across a universe. Portfolio agents call this continuously.</p>
    <pre>{ "universe": ["crypto", "defi"], "top_n": 5, "min_score": 0.6 }</pre>
    <pre>{
  "top": [
    { "symbol": "SOL", "opportunity_score": 0.92, "trend": "bullish", "action": "buy", "confidence": 0.88, "risk_reward": 3.2, "timeframe": "short", "catalyst": "breakout" },
    { "symbol": "ETH", "opportunity_score": 0.85, "trend": "bullish", "action": "buy", "confidence": 0.81, "risk_reward": 2.8, "timeframe": "medium", "catalyst": "momentum" }
  ],
  "count": 2,
  "universe": ["crypto", "defi"],
  "scanned": 10
}</pre>
  </div>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/signal/:symbol</code> &nbsp; <span class="method">GET</span><code>/signal/batch</code></p>
    <p>Legacy v1 endpoints — still functional. Upgrade to v2 endpoints for agent loops.</p>
  </div>

  <h2>Pricing</h2>
  <table>
    <tr><th>Plan</th><th>Price</th><th>Calls/day</th><th>Calls/mo</th></tr>
    <tr><td>Free</td><td>$0</td><td>10</td><td>100</td></tr>
    <tr><td>Starter</td><td>$19/mo</td><td>500</td><td>5,000</td></tr>
    <tr><td>Pro</td><td>$49/mo</td><td>2,000</td><td>20,000</td></tr>
    <tr><td>Business</td><td>$199/mo</td><td>10,000</td><td>100,000</td></tr>
    <tr><td>Agent Pay Per Call</td><td>$0.002/scan · $0.001/score · $0.0015/event · $0.003/rank</td><td>—</td><td>—</td></tr>
    <tr><td>High Volume Agent</td><td>$0.0008/scan · $0.0004/score · $0.0006/event · $0.001/rank</td><td>—</td><td>—</td></tr>
  </table>
</body>
</html>`);
});


router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Trading Signal & Opportunity Detection API',
      version: '2.0.0',
      description: 'Real-time alpha signal engine for autonomous agents. Scan, filter, score, explain, detect events and rank opportunities.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/scan-signals': 0.002, '/filter-signals': 0.0008, '/score-asset': 0.0015, '/explain': 0.0025, '/detect-event': 0.002, '/rank-opportunities': 0.0035 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      execution_gate_required: true,
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': false,},
    servers: [{ url: 'https://orbis-apis.onrender.com/alpha-signal' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/scan-signals': { post: { operationId: 'scanSignals', summary: 'Scan up to 10 assets for live trading signals', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          symbols: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10, description: 'Asset symbols to scan' },
          timeframe: { type: 'string', enum: ['1m', '5m', '15m', '1h', '4h', '1d'], default: '1h' },
        }}}}},
        responses: { '200': { description: 'Trading signals', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          signals: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            symbol: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold', 'watch'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 }, urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
            entry_zone: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' }, low: { type: 'number' }, high: { type: 'number' } } },
            stop_loss: { type: 'number' }, take_profit: { type: 'number' }, risk_reward: { type: 'number' },
          }}},
          count: { type: 'integer' },
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, signals: { type: 'number' }, market_regime: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/filter-signals': { post: { operationId: 'filterSignals', summary: 'Filter signal array by confidence, type, action, urgency', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['signals'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          signals: { type: 'array', items: { type: 'object' } },
          min_confidence: { type: 'number', minimum: 0, maximum: 1 },
          action: { type: 'string', enum: ['buy', 'sell', 'hold', 'watch'] },
          urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
        }}}}},
        responses: { '200': { description: 'Filtered signals', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          signals: { type: 'array', items: { type: 'object' } },
          count: { type: 'integer' },
          filtered_out: { type: 'integer' },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/score-asset': { post: { operationId: 'scoreAsset', summary: 'Composite score: trend, momentum, volume, sentiment, regime', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          symbol: { type: 'string' }, timeframe: { type: 'string', default: '1h' },
        }}}}},
        responses: { '200': { description: 'Asset score', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          symbol: { type: 'string' },
          composite_score: { type: 'number', minimum: 0, maximum: 100 },
          trend_score: { type: 'number', minimum: 0, maximum: 100 },
          momentum_score: { type: 'number', minimum: 0, maximum: 100 },
          volume_score: { type: 'number', minimum: 0, maximum: 100 },
          sentiment_score: { type: 'number', minimum: 0, maximum: 100 },
          regime: { type: 'string', enum: ['bull', 'bear', 'neutral', 'volatile'] },
          bias: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/detect-event': { post: { operationId: 'detectEvent', summary: 'Detect volume spikes, breakouts, whale moves', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' }, symbol: { type: 'string' } }}}}},
        responses: { '200': { description: 'Detected events', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          symbol: { type: 'string' },
          events: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            type: { type: 'string', enum: ['volume_spike', 'breakout', 'breakdown', 'whale_move', 'flash_crash'] },
            impact_score: { type: 'number', minimum: 0, maximum: 100 },
            direction: { type: 'string' }, description: { type: 'string' },
          }}},
          confidence_per_section: { type: 'object' },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/rank-opportunities': { post: { operationId: 'rankOpportunities', summary: 'Rank assets by opportunity score', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          universe: { type: 'string', enum: ['crypto', 'defi', 'l1', 'l2', 'meme'], default: 'crypto' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        }}}}},
        responses: { '200': { description: 'Ranked opportunities', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          opportunities: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            rank: { type: 'integer' }, symbol: { type: 'string' },
            opportunity_score: { type: 'number', minimum: 0, maximum: 100 },
            risk_reward: { type: 'number' }, action: { type: 'string' },
          }}},
          universe: { type: 'string' }, count: { type: 'integer' },
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        }}}}}}}},
      '/explain': { post: { operationId: 'explainSignal', summary: 'Deep explanation of a signal with drivers and risk factors', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          symbol: { type: 'string' }, signal: { type: 'object' },
        }}}}},
        responses: { '200': { description: 'Signal explanation', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          symbol: { type: 'string' }, explanation: { type: 'string' },
          drivers: { type: 'array', items: { type: 'string' } },
          risk_factors: { type: 'array', items: { type: 'string' } },
          contra_indicators: { type: 'array', items: { type: 'string' } },
          confidence_breakdown: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, price: { type: 'number' }, volume: { type: 'number' }, trend: { type: 'number' }, context: { type: 'number' } } },
          recommendation: { type: 'string' },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate autonomous trade execution based on signal strength', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'action'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          symbol: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
          min_confidence: { type: 'number', default: 0.7, minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        }}}}}}}},
    },
  });

});

export default router;
