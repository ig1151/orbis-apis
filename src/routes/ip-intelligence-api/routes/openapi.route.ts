import { Router, Request, Response } from 'express';
import { config } from '../utils/config';
export const openapiRouter = Router();
export const docsRouter = Router();

const docsHtml = `<!DOCTYPE html>
<html>
<head>
  <title>IP Intelligence API — Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
    .get { background: #e3f2fd; color: #1565c0; }
    .post { background: #e8f5e9; color: #2e7d32; }
    .endpoint { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .path { font-family: monospace; font-size: 1rem; font-weight: bold; }
    .desc { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  </style>
</head>
<body>
  <h1>IP Intelligence API</h1>
  <p>The simple fraud detection API for startups. Know instantly if an IP is a VPN, proxy, Tor node or datacenter — with a risk score out of 100 to power your trust and safety decisions.</p>
  <p><strong>Base URL:</strong> <code>https://ip-intelligence-api.onrender.com</code></p>
  <h2>Endpoints</h2>
  <div class="endpoint">
    <div><span class="badge get">GET</span><span class="path">/v1/lookup</span></div>
    <div class="desc">Look up a single IP address</div>
    <pre>curl "https://ip-intelligence-api.onrender.com/v1/lookup?ip=8.8.8.8"</pre>
  </div>
  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/lookup</span></div>
    <div class="desc">Look up a single IP via request body</div>
    <pre>curl -X POST https://ip-intelligence-api.onrender.com/v1/lookup \\
  -H "Content-Type: application/json" \\
  -d '{"ip": "8.8.8.8"}'</pre>
  </div>
  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/lookup/batch</span></div>
    <div class="desc">Look up up to 50 IPs in one request</div>
    <pre>curl -X POST https://ip-intelligence-api.onrender.com/v1/lookup/batch \\
  -H "Content-Type: application/json" \\
  -d '{"ips": [{"ip": "8.8.8.8"}, {"ip": "1.1.1.1"}]}'</pre>
  </div>
  <div class="endpoint">
    <div><span class="badge get">GET</span><span class="path">/v1/health</span></div>
    <div class="desc">Service health check</div>
    <pre>curl "https://ip-intelligence-api.onrender.com/v1/health"</pre>
  </div>
  <h2>Example Response</h2>
  <pre>{
  "ip": "8.8.8.8",
  "type": "IPv4",
  "status": "success",
  "location": {
    "country": "United States",
    "country_code": "US",
    "city": "Mountain View",
    "timezone": "America/Los_Angeles",
    "latitude": 37.386,
    "longitude": -122.083
  },
  "network": {
    "asn": "AS15169",
    "org": "Google LLC",
    "isp": "Google LLC"
  },
  "risk": {
    "score": 30,
    "threat_level": "medium",
    "is_vpn": false,
    "is_proxy": false,
    "is_tor": false,
    "is_hosting": true,
    "is_anonymous": false,
    "factors": ["Hosted on cloud/datacenter infrastructure"]
  },
  "network": {
    "asn": "AS15169 Google LLC",
    "asn_number": 15169,
    "org": "Google Public DNS",
    "isp": "Google LLC",
    "connection_type": "hosting"
  },
  "latency_ms": 245,
  "created_at": "2026-04-12T00:00:00.000Z"
}</pre>
  <h2>OpenAPI Spec</h2>
  <p><a href="/openapi.json">Download openapi.json</a></p>
  <h2>Risk score explained</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr style="background:#f5f5f5;">
      <th style="text-align:left;padding:8px;border:1px solid #ddd;">Score</th>
      <th style="text-align:left;padding:8px;border:1px solid #ddd;">Threat level</th>
      <th style="text-align:left;padding:8px;border:1px solid #ddd;">Meaning</th>
    </tr>
    <tr><td style="padding:8px;border:1px solid #ddd;">0–19</td><td style="padding:8px;border:1px solid #ddd;">Low</td><td style="padding:8px;border:1px solid #ddd;">Clean residential or business IP — safe to allow</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;">20–49</td><td style="padding:8px;border:1px solid #ddd;">Medium</td><td style="padding:8px;border:1px solid #ddd;">Hosting or datacenter IP — review before allowing</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;">50–79</td><td style="padding:8px;border:1px solid #ddd;">High</td><td style="padding:8px;border:1px solid #ddd;">VPN or proxy detected — likely anonymous user</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;">80–100</td><td style="padding:8px;border:1px solid #ddd;">Critical</td><td style="padding:8px;border:1px solid #ddd;">Tor exit node or known malicious IP — block recommended</td></tr>
  </table>
  <h2>Quick start example</h2>
  <pre>const res = await fetch("https://ip-intelligence-api.onrender.com/v1/lookup?ip=" + userIP);
const { risk } = await res.json();

if (risk.score > 60) blockUser();
else if (risk.score > 20) requireExtraVerification();
else allowUser();</pre>
</body>
</html>`;

docsRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(docsHtml);
});

openapiRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    openapi: '3.0.3',
    info: { title: 'IP Intelligence API', version: '1.0.0', description: 'Location, network and risk intelligence for any IP address.' },
    servers: [{ url: 'https://ip-intelligence-api.onrender.com', description: 'Production' }, { url: `http://localhost:${config.server.port}`, description: 'Local' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', operationId: 'getHealth', responses: { '200': { description: 'Service is healthy' } } } },
      '/v1/lookup': {
        get: { summary: 'Look up a single IP via GET', operationId: 'lookupIPGet', parameters: [{ name: 'ip', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'IP intelligence data' }, '422': { description: 'Validation error' } } },
        post: { summary: 'Look up a single IP via POST', operationId: 'lookupIPPost', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LookupRequest' } } } }, responses: { '200': { description: 'IP intelligence data' } } },
      },
      '/v1/lookup/batch': { post: { summary: 'Look up up to 50 IPs', operationId: 'lookupBatch', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchRequest' } } } }, responses: { '200': { description: 'Batch results' } } } },
    },
    components: {
      schemas: {
        LookupRequest: { type: 'object', required: ['ip'], properties: { ip: { type: 'string', example: '8.8.8.8' } } },
        BatchRequest: { type: 'object', required: ['ips'], properties: { ips: { type: 'array', items: { $ref: '#/components/schemas/LookupRequest' }, minItems: 1, maxItems: 50 } } },
      },
    },
  });
});
