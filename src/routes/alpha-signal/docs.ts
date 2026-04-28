import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alpha Signal API — Docs</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; background: #0f0f0f; color: #e0e0e0; }
    h1 { color: #f59e0b; } h2 { color: #fbbf24; border-bottom: 1px solid #222; padding-bottom: 6px; }
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: #34d399; }
    pre { background: #1a1a1a; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .method { background: #78350f; color: #fde68a; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 8px; }
    .endpoint { margin: 24px 0; padding: 16px; border: 1px solid #222; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; } td, th { padding: 8px 12px; border: 1px solid #333; text-align: left; }
    th { background: #1a1a1a; color: #fbbf24; }
  </style>
</head>
<body>
  <h1>⚡ Alpha Signal API</h1>
  <p>AI-powered multi-chain trade signals for ETH, BNB, and SOL. Combines price data, news sentiment, and on-chain activity into actionable buy/sell/hold signals.</p>
  <p><strong>Base URL:</strong> <code>https://your-service.onrender.com</code></p>
  <p><strong>Supported:</strong> ETH · BNB · SOL</p>

  <h2>Endpoints</h2>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/signal/:symbol</code></p>
    <p>Generate an AI trade signal for a single asset.</p>
    <pre>GET /v1/signal/ETH</pre>
    <pre>{
  "symbol": "ETH",
  "signal": "buy",
  "confidence": 0.82,
  "sentiment": "bullish",
  "momentum": "strong",
  "risk_level": "medium",
  "reasoning": "ETH showing strong momentum with positive news flow...",
  "key_factors": ["24h volume surge", "positive sentiment", "price above MA"],
  "price_data": { "price_usd": 3200.45, "change_24h": 4.2, ... },
  "timestamp": "..."
}</pre>
  </div>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/signal/batch</code></p>
    <p>Generate signals for ETH, BNB, and SOL in a single call.</p>
    <pre>GET /v1/signal/batch</pre>
  </div>

  <h2>Health</h2>
  <pre>GET /v1/health</pre>

  <h2>Pricing</h2>
  <table>
    <tr><th>Plan</th><th>Price</th><th>Daily</th><th>Monthly</th></tr>
    <tr><td>Free</td><td>$0</td><td>10</td><td>100</td></tr>
    <tr><td>Starter</td><td>$19/mo</td><td>500</td><td>1,000</td></tr>
    <tr><td>Pro</td><td>$49/mo</td><td>2,000</td><td>5,000</td></tr>
    <tr><td>Business</td><td>$149/mo</td><td>10,000</td><td>20,000</td></tr>
    <tr><td>Pay Per Call</td><td>$0.15/call</td><td>—</td><td>—</td></tr>
  </table>
</body>
</html>`);
});

export default router;
