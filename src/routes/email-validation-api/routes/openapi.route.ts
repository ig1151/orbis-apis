import { Router, Request, Response } from 'express';
import { config } from '../utils/config';

export const openapiRouter = Router();
export const docsRouter = Router();

const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Email Validation API — Docs</title>
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
    .tag { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
  </style>
</head>
<body>
  <h1>Email Validation API</h1>
  <p>Validate and verify email addresses — format, MX records, disposable detection and spam trap scoring.</p>
  <p><strong>Base URL:</strong> <code>https://orbis-apis.onrender.com/email-validation"endpoint">
    <div><span class="badge get">GET</span><span class="path">/v1/validate</span></div>
    <div class="desc">Validate a single email via query parameter</div>
    <pre>curl "https://orbis-apis.onrender.com/email-validation"</pre>
  </div>

  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/validate</span></div>
    <div class="desc">Validate a single email via request body</div>
    <pre>curl -X POST https://orbis-apis.onrender.com/email-validation"Content-Type: application/json" \\
  -d '{"email": "user@gmail.com", "check_mx": true, "check_disposable": true}'</pre>
  </div>

  <div class="endpoint">
    <div><span class="badge post">POST</span><span class="path">/v1/validate/batch</span></div>
    <div class="desc">Validate up to 100 emails in one request</div>
    <pre>curl -X POST https://orbis-apis.onrender.com/email-validation"Content-Type: application/json" \\
  -d '{"emails": [{"email": "user@gmail.com"}, {"email": "fake@mailinator.com"}]}'</pre>
  </div>

  <div class="endpoint">
    <div><span class="badge get">GET</span><span class="path">/v1/health</span></div>
    <div class="desc">Service health check</div>
    <pre>curl "https://orbis-apis.onrender.com/email-validation"</pre>
  </div>

  <h2>Example Response</h2>
  <pre>{
  "email": "user@gmail.com",
  "status": "valid",
  "score": 100,
  "format_valid": true,
  "mx_found": true,
  "disposable": false,
  "free_provider": true,
  "role_based": false,
  "spam_trap_likely": false,
  "domain": "gmail.com",
  "username": "user",
  "checks": {
    "format": true,
    "mx": true,
    "disposable": true,
    "spam_trap": true
  },
  "latency_ms": 5,
  "created_at": "2026-04-12T00:00:00.000Z"
}</pre>

  <h2>Status values</h2>
  <span class="tag">valid</span>
  <span class="tag">invalid</span>
  <span class="tag">risky</span>
  <span class="tag">unknown</span>

  <h2>OpenAPI Spec</h2>
  <p><a href="/openapi.json">Download openapi.json</a></p>
</body>
</html>`;

docsRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

openapiRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    openapi: '3.0.3',
    info: { title: 'Email Validation API', version: '1.0.0', description: 'Validate and verify email addresses — format, MX records, disposable detection and spam trap scoring.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/email-validation', description: 'Production' }],
    paths: {
      '/v1/health': { get: { summary: 'Health check', operationId: 'getHealth', responses: { '200': { description: 'Service is healthy' } } } },
      '/v1/validate': {
        get: { summary: 'Validate a single email via GET', operationId: 'validateEmailGet', parameters: [{ name: 'email', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Validation result' }, '422': { description: 'Validation error' } } },
        post: { summary: 'Validate a single email via POST', operationId: 'validateEmailPost', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateRequest' } } } }, responses: { '200': { description: 'Validation result' }, '422': { description: 'Validation error' } } },
      },
      '/v1/validate/batch': { post: { summary: 'Validate up to 100 emails in one request', operationId: 'validateBatch', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchRequest' } } } }, responses: { '200': { description: 'Batch results' } } } },
    },
    components: {
      schemas: {
        ValidateRequest: { type: 'object', required: ['email'], properties: { email: { type: 'string', example: 'user@example.com' }, check_mx: { type: 'boolean', default: true }, check_disposable: { type: 'boolean', default: true }, check_spam_trap: { type: 'boolean', default: true } } },
        ValidationResult: { type: 'object', properties: { email: { type: 'string' }, status: { type: 'string', enum: ['valid', 'invalid', 'risky', 'unknown'] }, score: { type: 'integer', minimum: 0, maximum: 100 }, format_valid: { type: 'boolean' }, mx_found: { type: 'boolean' }, disposable: { type: 'boolean' }, free_provider: { type: 'boolean' }, role_based: { type: 'boolean' }, spam_trap_likely: { type: 'boolean' }, domain: { type: 'string' }, username: { type: 'string' }, did_you_mean: { type: 'string' }, latency_ms: { type: 'integer' }, created_at: { type: 'string', format: 'date-time' } } },
        BatchRequest: { type: 'object', required: ['emails'], properties: { emails: { type: 'array', items: { $ref: '#/components/schemas/ValidateRequest' }, minItems: 1, maxItems: 100 } } },
      },
    },
  });
});