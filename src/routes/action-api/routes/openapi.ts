import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Action API',
      version: '1.0.0',
      description: 'Execution layer for AI agents — take action on leads, companies and outreach with one call.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/action' }],
    paths: {
      '/v1/action': {
        post: {
          summary: 'Execute an action',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['send_outreach', 'enrich_lead', 'research_company', 'find_contacts', 'score_lead', 'draft_proposal'] },
                    company: { type: 'string' },
                    lead: { type: 'object' },
                    goal: { type: 'string' },
                    contact_role: { type: 'string' },
                    sender_name: { type: 'string' },
                    sender_company: { type: 'string' },
                    tone: { type: 'string', enum: ['professional', 'casual', 'direct'] },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Action result' } },
        },
      },
      '/v1/actions': {
        get: { summary: 'List available actions', responses: { '200': { description: 'Action list' } } },
      },
      '/v1/health': {
        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } },
      },
    },
  });
});

export default router;
