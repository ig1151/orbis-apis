import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Wallet Balance API — Docs</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; background: #0f0f0f; color: #e0e0e0; }
    h1 { color: #4ade80; } h2 { color: #86efac; border-bottom: 1px solid #222; padding-bottom: 6px; }
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: #fbbf24; }
    pre { background: #1a1a1a; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .method { background: #166534; color: #bbf7d0; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 8px; }
    .endpoint { margin: 24px 0; padding: 16px; border: 1px solid #222; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; } td, th { padding: 8px 12px; border: 1px solid #333; text-align: left; }
    th { background: #1a1a1a; color: #86efac; }
  </style>
</head>
<body>
  <h1>🔐 Wallet Balance API</h1>
  <p>On-chain wallet balances, ERC20 token holdings, and transaction history via Etherscan.</p>
  <p><strong>Base URL:</strong> <code>https://orbis-apis.onrender.com/wallet</code></p>

  <h2>Endpoints</h2>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/balance/:address</code></p>
    <p>Returns the native ETH balance for a wallet address.</p>
    <pre>GET /v1/balance/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe</pre>
    <pre>{ "address": "0x...", "balance_wei": "1234567890000000000", "balance_eth": "1.23456789", "timestamp": "..." }</pre>
  </div>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/tokens/:address</code></p>
    <p>Returns unique ERC20 tokens seen in recent transfers. Query params: <code>page</code>, <code>offset</code> (max 100).</p>
    <pre>GET /v1/tokens/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe?page=1&amp;offset=20</pre>
  </div>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/portfolio/:address</code></p>
    <p>Returns ETH balance + ERC20 token list in a single call.</p>
    <pre>GET /v1/portfolio/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe</pre>
  </div>

  <div class="endpoint">
    <p><span class="method">GET</span><code>/v1/transactions/:address</code></p>
    <p>Returns recent transactions. Query params: <code>page</code>, <code>offset</code> (max 50), <code>sort</code> (asc/desc).</p>
    <pre>GET /v1/transactions/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe?offset=10&amp;sort=desc</pre>
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
    <tr><td>Pay Per Call</td><td>$0.005/call</td><td>—</td><td>—</td></tr>
  </table>
</body>
</html>`);
});

export default router;
