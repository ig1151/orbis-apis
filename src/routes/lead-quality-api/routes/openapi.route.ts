import { Router, Request, Response } from 'express';
import { config } from '../utils/config';
export const openapiRouter = Router();
export const docsRouter = Router();

const docsHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Lead Quality API — Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
    .post { background: #e8f5e9; color: #2e7d32; }
    .get { background: #e3f2fd; color: #1565c0; }
    .endpoint { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .path { font-family: monospace; font-size: 1rem; font-weight: bold; }
    .desc { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
    th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Lead Quality API</h1>
  <p>Score any lead's quality and conversion likelihood — B2B detection, company enrichment, contact validation and AI-powered scoring.</p>
  <p><strong>Base URL:</strong> <code>https://orbis-apis.onrender.com/lead-quality"https://orbis-apis.onrender.com/lead-quality", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "john@stripe.com",
    phone: "+14155552671",
    domain: "stripe.com"
  })
});
const { lead_score, quality, likely_to_convert, is_b2b } = await res.json();
if (quality === "excellent") prioritizeLead();
else if (likely_to_convert) addToNurture();
else deprioritize();</pre>

  <h2>Endpoints</h2>
  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/score</span></div>
    <div class="desc">Score a single lead</div>
    <pre>curl -X POST https://orbis-apis.onrender.com/lead-quality"Content-Type: application/json" \\
  -d '{"email": "john@stripe.com", "domain": "stripe.com"}'</pre>
  </div>
  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/score/batch</span></div>
    <div class="desc">Score up to 20 leads in one request</div>
    <pre>curl -X POST https://orbis-apis.onrender.com/lead-quality"Content-Type: application/json" \\
  -d '{"leads": [{"email": "john@stripe.com"}, {"email": "test@gmail.com"}]}'</pre>
  </div>

  <h2>Example Response</h2>
  <pre>{
  "id": "lead_abc123",
  "lead_score": 82,
  "quality": "excellent",
  "is_b2b": true,
  "likely_to_convert": true,
  "conversion_confidence": 0.82,
  "contact": {
    "email_valid": true,
    "email_disposable": false,
    "email_free_provider": false,
    "phone_valid": true,
    "phone_line_type": "mobile"
  },
  "company": {
    "name": "Stripe",
    "industry": "Financial Technology",
    "company_size": "enterprise",
    "is_b2b": true,
    "technologies": ["Payments", "APIs"]
  },
  "conversion_signals": {
    "positive_signals": ["Business email", "Enterprise company", "B2B product"],
    "negative_signals": []
  },
  "latency_ms": 1240
}</pre>

  <h2>Quality levels</h2>
  <table>
    <tr><th>Quality</th><th>Score range</th><th>Meaning</th></tr>
    <tr><td>excellent</td><td>80–100</td><td>High priority lead — contact immediately</td></tr>
    <tr><td>good</td><td>60–79</td><td>Worth pursuing — add to active pipeline</td></tr>
    <tr><td>fair</td><td>40–59</td><td>Moderate quality — add to nurture sequence</td></tr>
    <tr><td>poor</td><td>0–39</td><td>Low quality — deprioritize or discard</td></tr>
  </table>

  <h2>OpenAPI Spec</h2>
  <p><a href="/openapi.json">Download openapi.json</a></p>
</body>
</html>`;

docsRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(docsHtml);
});

openapiRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    openapi: '3.0.3',
    info: { title: 'Lead Quality API', version: '1.0.0', description: 'Score lead quality — B2B detection, company enrichment and conversion likelihood.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/lead-quality', description: 'Production' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', operationId: 'getHealth', responses: { '200': { description: 'Service is healthy' } } } },
      '/v1/score': {
        post: { summary: 'Score a single lead', operationId: 'scoreLead', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ScoreRequest' }, examples: { full: { summary: 'Full scoring', value: { email: 'john@stripe.com', phone: '+14155552671', domain: 'stripe.com' } }, email_only: { summary: 'Email only', value: { email: 'john@stripe.com' } } } } } }, responses: { '200': { description: 'Lead quality score' }, '422': { description: 'Validation error' } } },
      },
      '/v1/score/batch': { post: { summary: 'Score up to 20 leads', operationId: 'scoreBatch', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchRequest' } } } }, responses: { '200': { description: 'Batch results' } } } },
    },
    components: {
      schemas: {
        ScoreRequest: { type: 'object', properties: { email: { type: 'string', example: 'john@stripe.com' }, phone: { type: 'string', example: '+14155552671' }, domain: { type: 'string', example: 'stripe.com' }, company_name: { type: 'string', example: 'Stripe' } }, minProperties: 1 },
        BatchRequest: { type: 'object', required: ['leads'], properties: { leads: { type: 'array', items: { $ref: '#/components/schemas/ScoreRequest' }, minItems: 1, maxItems: 20 } } },
      },
    },
  });
});
