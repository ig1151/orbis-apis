import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Phone Intelligence & Contact Verification API',
      version: '2.0.0',
      description: 'Validate, normalize, score, and risk-check phone numbers. Detect carrier risk, VoIP, disposable, and fake numbers. Gate autonomous contact workflows with execution-ready decisions.',
      'x-agent-callable': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/validate': 0.001,
        '/validate/batch': 0.002,
        '/score-phone': 0.003,
        '/risk-check': 0.004,
        '/normalize-contact': 0.002,
        '/detect-carrier-risk': 0.003,
        '/batch-score': 0.005,
        '/execution-gate': 0.004,
        '/register-webhook': 0.002,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/phone-validation', description: 'Production' }],
    paths: {
      '/validate': { post: { summary: 'Validate a phone number', tags: ['Validation'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' } }, required: ['phone'] } } } }, responses: { 200: { description: 'valid, E.164, country, line_type, risk' } } } },
      '/validate/batch': { post: { summary: 'Batch validate up to 100 phone numbers', tags: ['Validation'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phones: { type: 'array', items: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' } } } } }, required: ['phones'] } } } }, responses: { 200: { description: 'Batch results with valid/invalid counts' } } } },
      '/score-phone': { post: { summary: 'Score phone contact quality and reachability', tags: ['Contact Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' } }, required: ['phone'] } } } }, responses: { 200: { description: 'quality_score, reachability, recommended_channel, carrier_tier' } } } },
      '/risk-check': { post: { summary: 'Fraud and risk detection — returns fraud score, signals, allow/block', tags: ['Risk & Deliverability'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' }, context: { type: 'string' } }, required: ['phone'] } } } }, responses: { 200: { description: 'fraud_score, risk_level, fraud_signals, allow, recommended_action' } } } },
      '/normalize-contact': { post: { summary: 'Normalize phone to CRM-ready formats', tags: ['Contact Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }, required: ['phone'] } } } }, responses: { 200: { description: 'E.164, international, national formats, crm_ready bool' } } } },
      '/detect-carrier-risk': { post: { summary: 'Detect carrier risk, SMS/call deliverability, spam likelihood', tags: ['Risk & Deliverability'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' } }, required: ['phone'] } } } }, responses: { 200: { description: 'carrier_risk, sms_deliverability, call_deliverability, spam_likelihood' } } } },
      '/batch-score': { post: { summary: 'Batch score up to 50 phones for risk, validity, CRM readiness', tags: ['Contact Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phones: { type: 'array', items: { type: 'string' } }, country_code: { type: 'string' } }, required: ['phones'] } } } }, responses: { 200: { description: 'total, valid, crm_ready, high_risk counts with per-phone results' } } } },
      '/execution-gate': { post: { summary: 'Gate autonomous contact workflows — returns execute bool, blocking flags, next API', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { phone: { type: 'string' }, country_code: { type: 'string' }, context: { type: 'string' }, risk_threshold: { type: 'number' } }, required: ['phone'] } } } }, responses: { 200: { description: 'execution_ready, next_api, next_endpoint, blocking_flags, confidence, metadata' } } } },
      '/register-webhook': { post: { summary: 'Register webhook for contact risk alerts', tags: ['Webhooks'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { webhook_url: { type: 'string' }, risk_threshold: { type: 'number', description: 'Fire webhook when risk score exceeds this' }, phones: { type: 'array', items: { type: 'string' }, description: 'Phone numbers to monitor' } }, required: ['webhook_url'] } } } }, responses: { 200: { description: 'Webhook registered with id and status' } } } },
    },
  });
});

export default router;

export const openapiRouter = router;
export const docsRouter = router;
