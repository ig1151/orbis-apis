import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { router } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/v1', router);

app.get('/docs', (_req, res) => {
  res.send(`
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Derivatives Intelligence API</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#f7931a}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#f7931a;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>⚡ Derivatives Intelligence API</h1>
<p>Agent-ready derivatives intelligence for BTC &amp; ETH. Combines funding rates, liquidation pressure,
options sentiment, and spot data into a single decision-ready signal.<br/>
<span class="price">$0.01 / call</span></p>

<h2>Base URL</h2>
<pre>https://derivatives-intelligence-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/intelligence/:asset</td><td>Full derivatives intelligence report</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/intelligence/:asset/signal</td><td>Compact signal — bias, risk, confidence</td></tr>
</table>

<h2>Parameters</h2>
<p><code>:asset</code> — <strong>BTC</strong> or <strong>ETH</strong></p>

<h2>Example — Full Report</h2>
<pre>{
  "asset": "BTC",
  "timestamp": "2026-04-26T15:00:00Z",
  "spot": {
    "price": 94200,
    "change24h": 1.4,
    "volume24hUSD": 38400000000
  },
  "funding": {
    "averageRate": 0.0012,
    "sentiment": "long-heavy",
    "topExchange": "Binance",
    "arbitrageExists": true
  },
  "liquidations": {
    "recentHighSeverity": 4,
    "dominantSide": "long",
    "pressure": "elevated"
  },
  "options": {
    "putCallRatio": 1.03,
    "maxPain": 78000,
    "nearestExpiry": "27APR26",
    "totalCallOI": 16731,
    "totalPutOI": 17227
  },
  "intelligence": {
    "market_state": "overleveraged long",
    "risk_level": "elevated",
    "liquidation_pressure": "elevated",
    "bias": "short",
    "confidence": 0.75,
    "summary": "BTC signals: funding rates elevated, put/call ratio bearish. Overall bias short with elevated risk."
  }
}</pre>

<h2>Example — Signal Only</h2>
<pre>{
  "asset": "BTC",
  "bias": "short",
  "risk_level": "elevated",
  "confidence": 0.75,
  "market_state": "overleveraged long",
  "liquidation_pressure": "elevated",
  "timestamp": "2026-04-26T15:00:00Z"
}</pre>
</body></html>
  `);
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Derivatives Intelligence API',
      version: '1.0.0',
      description: 'Agent-ready derivatives intelligence combining funding rates, liquidations, options OI and spot data into a unified market bias signal.',
    },
    servers: [{ url: 'https://derivatives-intelligence-api.onrender.com' }],
    paths: {
      '/v1/health': {
        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } },
      },
      '/v1/intelligence/{asset}': {
        get: {
          summary: 'Full derivatives intelligence report',
          parameters: [{ name: 'asset', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'Full intelligence report with funding, liquidations, options, and bias' } },
        },
      },
      '/v1/intelligence/{asset}/signal': {
        get: {
          summary: 'Compact signal — bias, risk, confidence',
          parameters: [{ name: 'asset', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'Compact signal object' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[derivatives-intelligence-api] running on port ${PORT}`);
});
