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

export default router;
