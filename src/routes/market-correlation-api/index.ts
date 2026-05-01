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
<title>Market Correlation API</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#f59e0b}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#f59e0b;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>📊 Market Correlation API</h1>
<p>Crypto-to-macro correlation scores. Measures how BTC, ETH, and other assets move relative to S&P 500, DXY, gold, oil, and bonds.<br/>
<span class="price">$0.05 / call</span></p>

<h2>Base URL</h2>
<pre>https://market-correlation-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/correlation/:asset</td><td>Full correlation report for BTC or ETH</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/correlation/:asset/summary</td><td>Compact correlation summary with AI interpretation</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/correlation/matrix</td><td>Correlation matrix across all assets</td></tr>
</table>

<h2>Supported Assets</h2>
<p>Crypto: <strong>BTC</strong>, <strong>ETH</strong>, <strong>SOL</strong><br/>
Macro: <strong>SPY</strong> (S&P 500), <strong>DXY</strong> (US Dollar), <strong>GLD</strong> (Gold), <strong>USO</strong> (Oil), <strong>TLT</strong> (Bonds)</p>

<h2>Example Response</h2>
<pre>GET /v1/correlation/BTC

{
  "asset": "BTC",
  "period": "30d",
  "timestamp": "2026-04-26T17:00:00Z",
  "correlations": {
    "SPY":  { "score": 0.72, "label": "strong positive", "interpretation": "BTC moving with equities" },
    "DXY":  { "score": -0.61, "label": "moderate negative", "interpretation": "BTC inversely correlated with dollar" },
    "GLD":  { "score": 0.45, "label": "moderate positive", "interpretation": "Some safe-haven overlap" },
    "USO":  { "score": 0.21, "label": "weak positive", "interpretation": "Low correlation with oil" },
    "TLT":  { "score": -0.38, "label": "weak negative", "interpretation": "Mild inverse to bonds" }
  },
  "dominantMacroDriver": "SPY",
  "riskMode": "risk-on",
  "interpretation": "BTC is currently behaving as a risk asset, tracking equities closely while moving inverse to the dollar."
}</pre>
</body></html>
  `);
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Market Correlation API',
      version: '1.0.0',
      description: 'Crypto-to-macro correlation scores — BTC/ETH vs S&P500, DXY, gold, oil, bonds',
    },
    servers: [{ url: 'https://market-correlation-api.onrender.com' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/v1/correlation/{asset}': {
        get: {
          summary: 'Full correlation report',
          parameters: [
            { name: 'asset', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH', 'SOL'] } },
            { name: 'period', in: 'query', schema: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' } },
          ],
          responses: { '200': { description: 'Correlation scores against macro indicators' } },
        },
      },
      '/v1/correlation/{asset}/summary': {
        get: {
          summary: 'Compact correlation summary with AI interpretation',
          parameters: [
            { name: 'asset', in: 'path', required: true, schema: { type: 'string', enum: ['BTC', 'ETH', 'SOL'] } },
          ],
          responses: { '200': { description: 'Summary with dominant driver and risk mode' } },
        },
      },
      '/v1/correlation/matrix': {
        get: {
          summary: 'Full correlation matrix across all assets',
          responses: { '200': { description: 'NxN correlation matrix' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[market-correlation-api] running on port ${PORT}`);
});
