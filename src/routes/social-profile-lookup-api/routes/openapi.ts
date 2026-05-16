import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Social Profile Lookup API', version: '1.0.0', description: 'Find social profiles across platforms by name or email, get profile summaries, and aggregate cross-platform links for lead enrichment and outreach automation', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { 'find-profiles': '$0.004', 'profile-summary': '$0.003', links: '$0.003', 'execution-gate': '$0.001', lookup: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/social-profile-lookup' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/find-profiles': { post: { operationId: 'findProfiles', summary: 'Find social profiles by name and optional email', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, email: { type: 'string' }, company: { type: 'string' } } } } } }, responses: { '200': { description: 'Profiles found', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, profiles: { type: 'array', items: { type: 'object' } }, match_confidence: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/profile-summary': { post: { operationId: 'profileSummary', summary: 'Get AI-summarized profile from a URL', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['profile_url'], properties: { profile_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Profile summary', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, summary: { type: 'object' }, influence_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/links': { post: { operationId: 'getLinks', summary: 'Aggregate cross-platform profile links', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, email: { type: 'string' } } } } } }, responses: { '200': { description: 'Cross-platform links', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, links: { type: 'array', items: { type: 'object' } }, primary_platform: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'lookup', summary: 'ONE-CALL: full social profile intelligence — profiles + summary + links', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, email: { type: 'string' } } } } } }, responses: { '200': { description: 'Full social profile intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, profiles: { type: 'array', items: { type: 'object' } }, primary_profile: { type: 'object' }, outreach_recommendation: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
