import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Action API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; background: #0f0f0f; color: #e0e0e0; }
    h1 { color: #7c3aed; } h2 { color: #a78bfa; border-bottom: 1px solid #333; padding-bottom: 8px; }
    pre { background: #1a1a1a; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
    code { color: #c084fc; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin-right: 8px; color: white; }
    .post { background: #7c3aed; } .get { background: #065f46; }
    table { width: 100%; border-collapse: collapse; } td, th { padding: 8px 12px; border: 1px solid #333; text-align: left; }
    th { background: #1a1a1a; }
  </style>
</head>
<body>
  <h1>Action API</h1>
  <p>Execution layer for AI agents — take action on leads, companies and outreach with one call.</p>
  <h2>Endpoints</h2>
  <table>
    <tr><th>Method</th><th>Path</th><th>Description</th></tr>
    <tr><td><span class="badge post">POST</span></td><td>/v1/action</td><td>Execute an action</td></tr>
    <tr><td><span class="badge get">GET</span></td><td>/v1/actions</td><td>List available actions</td></tr>
    <tr><td><span class="badge get">GET</span></td><td>/v1/health</td><td>Health check</td></tr>
  </table>
  <h2>Available Actions</h2>
  <table>
    <tr><th>Action</th><th>Description</th></tr>
    <tr><td><code>send_outreach</code></td><td>Generate a ready-to-send cold email</td></tr>
    <tr><td><code>enrich_lead</code></td><td>Enrich a lead with company and contact data</td></tr>
    <tr><td><code>research_company</code></td><td>Full company intelligence in one call</td></tr>
    <tr><td><code>find_contacts</code></td><td>Find the best contacts at any company</td></tr>
    <tr><td><code>score_lead</code></td><td>Score and qualify a lead with reasoning</td></tr>
    <tr><td><code>draft_proposal</code></td><td>Draft a business proposal</td></tr>
  </table>
  <h2>Example</h2>
  <pre>POST /v1/action
{
  "action": "send_outreach",
  "company": "Stripe",
  "contact_role": "VP of Engineering",
  "goal": "sell API monitoring product",
  "sender_name": "Alex",
  "sender_company": "MonitorAI",
  "tone": "direct"
}</pre>
  <p><a href="/openapi.json" style="color:#a78bfa">OpenAPI JSON</a></p>
</body>
</html>`);
});

export default router;
