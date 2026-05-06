import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Website Monitor API', version: '1.0.0', description: 'Monitor any URL for changes — detects content diffs, summarizes what changed and delivers alerts via webhook.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/website-monitor' }],
    paths: {
      '/': {
        post: {
          summary: 'Create a monitor',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', description: 'URL to monitor (required)' }, interval: { type: 'string', description: 'Check interval — 1h|6h|12h|24h (default: 24h)' }, webhook_url: { type: 'string', description: 'Webhook URL for change alerts (optional)' }, alert_on: { type: 'array', items: { type: 'string' }, description: 'What to alert on — content|price|availability (default: all)' } } } } } },
          responses: { '201': { description: 'Monitor created' } }
        },
        get: { summary: 'List all monitors', responses: { '200': { description: 'Monitor list' } } },
      },
    },
  });
});

export default router;
