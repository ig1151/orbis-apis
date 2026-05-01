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
<title>Cross-Chain Bridge API</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#f59e0b}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#f59e0b;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>🌉 Cross-Chain Bridge API</h1>
<p>Best bridge routes, fees, and estimated times across 30+ chains powered by LI.FI.<br/>
<span class="price">$0.005 / call</span></p>

<h2>Base URL</h2>
<pre>https://cross-chain-bridge-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/bridge/routes</td><td>Best bridge routes for a token transfer</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/bridge/best</td><td>Single best route (cheapest, fastest, or safest)</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/bridge/chains</td><td>All supported chains</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/bridge/tokens</td><td>Supported tokens on a chain</td></tr>
</table>

<h2>Query Parameters — /v1/bridge/routes</h2>
<table>
<tr><th>Param</th><th>Required</th><th>Description</th></tr>
<tr><td>fromChain</td><td>yes</td><td>Source chain (ethereum, arbitrum, polygon, etc)</td></tr>
<tr><td>toChain</td><td>yes</td><td>Destination chain</td></tr>
<tr><td>fromToken</td><td>yes</td><td>Token symbol or address (USDC, ETH, etc)</td></tr>
<tr><td>toToken</td><td>yes</td><td>Token symbol or address on destination</td></tr>
<tr><td>amount</td><td>yes</td><td>Amount in token units (e.g. 100 for 100 USDC)</td></tr>
<tr><td>sort</td><td>no</td><td>cheapest | fastest | safest (default: cheapest)</td></tr>
</table>

<h2>Example — Best Route</h2>
<pre>GET /v1/bridge/best?fromChain=ethereum&toChain=arbitrum&fromToken=USDC&toToken=USDC&amount=1000

{
  "fromChain": "ethereum",
  "toChain": "arbitrum",
  "fromToken": "USDC",
  "toToken": "USDC",
  "amount": "1000",
  "bestRoute": {
    "bridge": "Across",
    "estimatedOutput": "999.12",
    "feesUSD": 0.88,
    "estimatedTimeSeconds": 45,
    "steps": 1,
    "score": "cheapest"
  }
}</pre>
</body></html>
  `);
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Cross-Chain Bridge API',
      version: '1.0.0',
      description: 'Best bridge routes, fees and times across 30+ chains via LI.FI',
    },
    servers: [{ url: 'https://cross-chain-bridge-api.onrender.com' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/v1/bridge/routes': {
        get: {
          summary: 'All bridge routes for a token transfer',
          parameters: [
            { name: 'fromChain', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'toChain', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'fromToken', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'toToken', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'amount', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['cheapest', 'fastest', 'safest'] } },
          ],
          responses: { '200': { description: 'Available bridge routes' } },
        },
      },
      '/v1/bridge/best': {
        get: {
          summary: 'Single best bridge route',
          parameters: [
            { name: 'fromChain', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'toChain', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'fromToken', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'toToken', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'amount', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['cheapest', 'fastest', 'safest'] } },
          ],
          responses: { '200': { description: 'Best route' } },
        },
      },
      '/v1/bridge/chains': {
        get: { summary: 'All supported chains', responses: { '200': { description: 'Chain list' } } },
      },
      '/v1/bridge/tokens': {
        get: {
          summary: 'Supported tokens on a chain',
          parameters: [{ name: 'chain', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Token list' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[cross-chain-bridge-api] running on port ${PORT}`);
});
