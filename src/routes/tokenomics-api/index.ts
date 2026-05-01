import 'dotenv/config';
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
<title>Tokenomics API</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#a78bfa}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#a78bfa;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>🪙 Tokenomics API</h1>
<p>Token supply schedules, inflation rates, vesting data, and AI scoring for crypto tokens.<br/>
<span class="price">$0.05 / call</span></p>

<h2>Base URL</h2>
<pre>https://tokenomics-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/tokenomics/:token</td><td>Full tokenomics report with AI score</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/tokenomics/:token/supply</td><td>Supply schedule and inflation data</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/tokenomics/:token/score</td><td>AI tokenomics health score (0-100)</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/tokenomics/compare</td><td>Compare tokenomics across multiple tokens</td></tr>
</table>

<h2>Example Response</h2>
<pre>GET /v1/tokenomics/BTC

{
  "token": "BTC",
  "name": "Bitcoin",
  "timestamp": "2026-04-26T17:00:00Z",
  "supply": {
    "circulating": 19700000,
    "total": 21000000,
    "max": 21000000,
    "circulatingPct": 93.8,
    "inflationRate": 0.85,
    "emissionSchedule": "halving"
  },
  "market": {
    "price": 94200,
    "marketCap": 1855740000000,
    "fullyDilutedValuation": 1978200000000,
    "fdvToMcapRatio": 1.07
  },
  "score": {
    "overall": 91,
    "label": "excellent",
    "breakdown": {
      "supplyHealth": 95,
      "inflationRisk": 90,
      "vestingRisk": 100,
      "distributionFairness": 80
    },
    "verdict": "Bitcoin has near-perfect tokenomics with hard-capped supply, predictable halving schedule, and no VC vesting overhangs."
  }
}</pre>
</body></html>
  `);
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Tokenomics API', version: '1.0.0', description: 'Token supply schedules, inflation rates, and AI scoring for crypto tokens' },
    servers: [{ url: 'https://tokenomics-api.onrender.com' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/v1/tokenomics/{token}': {
        get: {
          summary: 'Full tokenomics report with AI score',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Full tokenomics report' } },
        },
      },
      '/v1/tokenomics/{token}/supply': {
        get: {
          summary: 'Supply schedule and inflation data',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Supply data' } },
        },
      },
      '/v1/tokenomics/{token}/score': {
        get: {
          summary: 'AI tokenomics health score',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Score 0-100' } },
        },
      },
      '/v1/tokenomics/compare': {
        get: {
          summary: 'Compare tokenomics across tokens',
          parameters: [{ name: 'tokens', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Comparison table' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[tokenomics-api] running on port ${PORT}`);
});
