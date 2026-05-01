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
<title>Yield Farming API</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#e0e0e0}
  h1{color:#4caf50}h2{color:#627eea;margin-top:2rem}
  pre{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:16px;overflow-x:auto;font-size:.85rem}
  .badge{display:inline-block;background:#1a3a1a;color:#4caf50;border-radius:4px;padding:2px 8px;font-size:.75rem;margin-right:6px}
  .price{color:#4caf50;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #2a2a2a}th{color:#999}
</style></head><body>
<h1>🌾 Yield Farming API</h1>
<p>DeFi yield farming analytics powered by DeFiLlama. APY, TVL, risk scores, and impermanent loss estimates across 500+ protocols and 50+ chains.<br/>
<span class="price">$0.05 / call</span></p>

<h2>Base URL</h2>
<pre>https://yield-farming-api.onrender.com</pre>

<h2>Endpoints</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Description</th></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/yields/top</td><td>Top yield opportunities with risk scores</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/yields/search</td><td>Search pools by token, chain, or protocol</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/yields/pool/:poolId</td><td>Single pool details with IL estimate</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/yields/chains</td><td>Best yields summarized by chain</td></tr>
<tr><td><span class="badge">GET</span></td><td>/v1/yields/stable</td><td>Top stablecoin yields (low IL risk)</td></tr>
</table>

<h2>Query Parameters — /v1/yields/top</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td>limit</td><td>10</td><td>Number of results (max 50)</td></tr>
<tr><td>minTvl</td><td>1000000</td><td>Minimum TVL in USD</td></tr>
<tr><td>maxRisk</td><td>5</td><td>Max risk score 1–5</td></tr>
<tr><td>chain</td><td>all</td><td>Filter by chain (ethereum, arbitrum, etc)</td></tr>
</table>

<h2>Example — Top Yields</h2>
<pre>{
  "timestamp": "2026-04-26T17:00:00Z",
  "count": 5,
  "pools": [
    {
      "poolId": "abc123",
      "protocol": "Aave V3",
      "chain": "ethereum",
      "symbol": "USDC",
      "apy": 8.42,
      "apyBase": 5.1,
      "apyReward": 3.32,
      "tvlUSD": 245000000,
      "riskScore": 1,
      "riskLabel": "low",
      "ilRisk": "none",
      "category": "lending"
    }
  ]
}</pre>

<h2>Risk Score Guide</h2>
<table>
<tr><th>Score</th><th>Label</th><th>Meaning</th></tr>
<tr><td>1</td><td>low</td><td>Single asset or stablecoin, audited protocol</td></tr>
<tr><td>2</td><td>low-medium</td><td>Stablecoin LP or blue chip lending</td></tr>
<tr><td>3</td><td>medium</td><td>Volatile LP, established protocol</td></tr>
<tr><td>4</td><td>high</td><td>New protocol or exotic assets</td></tr>
<tr><td>5</td><td>very high</td><td>Unaudited, very high APY, small TVL</td></tr>
</table>
</body></html>
  `);
});

app.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Yield Farming API',
      version: '1.0.0',
      description: 'DeFi yield farming analytics — APY, TVL, risk scores and impermanent loss via DeFiLlama',
    },
    servers: [{ url: 'https://yield-farming-api.onrender.com' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/v1/yields/top': {
        get: {
          summary: 'Top yield opportunities',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'minTvl', in: 'query', schema: { type: 'number', default: 1000000 } },
            { name: 'maxRisk', in: 'query', schema: { type: 'integer', default: 5 } },
            { name: 'chain', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Top pools with risk scores' } },
        },
      },
      '/v1/yields/search': {
        get: {
          summary: 'Search pools by token, chain or protocol',
          parameters: [
            { name: 'token', in: 'query', schema: { type: 'string' } },
            { name: 'chain', in: 'query', schema: { type: 'string' } },
            { name: 'protocol', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'Matching pools' } },
        },
      },
      '/v1/yields/pool/{poolId}': {
        get: {
          summary: 'Single pool details with IL estimate',
          parameters: [{ name: 'poolId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Pool details' } },
        },
      },
      '/v1/yields/chains': {
        get: {
          summary: 'Best yields by chain',
          responses: { '200': { description: 'Chain yield summary' } },
        },
      },
      '/v1/yields/stable': {
        get: {
          summary: 'Top stablecoin yields',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
          responses: { '200': { description: 'Stablecoin pools' } },
        },
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`[yield-farming-api] running on port ${PORT}`);
});
