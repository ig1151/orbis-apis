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

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── logger ────────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/v1', router);

// ── docs ──────────────────────────────────────────────────────────────────────
app.get('/docs', (_req, res) => {
  res.send(`
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Derivatives API Docs</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#f7931a}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#f7931a;font-weight:600}table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>⛓ Derivatives API</h1>
<p>Real-time BTC &amp; ETH options analytics powered by Deribit's public API.<br/>
<span class="price">$0.005 / call</span></p>

<h2>Base URL</h2>
<pre>https://derivatives-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/options/summary/:currency</td><td>Full options summary (OI, PCR, max pain)</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/options/open-interest/:currency</td><td>Open interest by expiry &amp; strike</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/options/put-call-ratio/:currency</td><td>Put/call ratio (volume + OI)</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/options/max-pain/:currency</td><td>Max pain price per expiry</td></tr>
</table>

<h2>Parameters</h2>
<p><code>:currency</code> — <strong>BTC</strong> or <strong>ETH</strong></p>

<h2>Example — Full Summary</h2>
<pre>GET /v1/options/summary/BTC</pre>
<pre>{
  "currency": "BTC",
  "timestamp": "2025-01-15T10:30:00Z",
  "summary": {
    "totalCallOI": 142500,
    "totalPutOI": 98300,
    "putCallRatioOI": 0.69,
    "putCallRatioVolume": 0.74,
    "nearestExpiry": "15JAN25",
    "maxPainByExpiry": {
      "15JAN25": 42000,
      "22JAN25": 41500,
      "31JAN25": 40000
    }
  }
}</pre>

<h2>Example — Max Pain</h2>
<pre>GET /v1/options/max-pain/ETH</pre>
<pre>{
  "currency": "ETH",
  "expiries": [
    { "expiry": "15JAN25", "maxPain": 2400, "totalNotional": 18200 },
    { "expiry": "31JAN25", "maxPain": 2350, "totalNotional": 42100 }
  ]
}</pre>
</body></html>
  `);
});

// ── openapi.json ──────────────────────────────────────────────────────────────
app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Derivatives API',
      version: '1.0.0',
      description: 'BTC/ETH options analytics — open interest, put/call ratio, max pain via Deribit',
    },
    servers: [{ url: 'https://derivatives-api.onrender.com' }],
    paths: {
      '/v1/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/v1/options/summary/{currency}': {
        get: {
          summary: 'Full options summary',
          parameters: [{ name: 'currency', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'Options summary with OI, PCR, and max pain' } },
        },
      },
      '/v1/options/open-interest/{currency}': {
        get: {
          summary: 'Open interest breakdown',
          parameters: [{ name: 'currency', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'Open interest by strike and expiry' } },
        },
      },
      '/v1/options/put-call-ratio/{currency}': {
        get: {
          summary: 'Put/call ratio',
          parameters: [{ name: 'currency', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'PCR by volume and open interest' } },
        },
      },
      '/v1/options/max-pain/{currency}': {
        get: {
          summary: 'Max pain price per expiry',
          parameters: [{ name: 'currency', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH'] } }],
          responses: { '200': { description: 'Max pain strike per expiry date' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[derivatives-api] running on port ${PORT}`);
});
