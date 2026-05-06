import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Unified Decision API', version: '1.0.0', description: 'One API call combining market signals, news impact and portfolio analysis into a single actionable decision' },
    servers: [{ url: 'https://orbis-apis.onrender.com/unified-decision' }],
    paths: {
      '/v1/decide': {
        post: {
          summary: 'Get unified trading decision',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['portfolio', 'risk_tolerance'],
                  properties: {
                    portfolio: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, value: { type: 'number' } } } },
                    risk_tolerance: { type: 'string', enum: ['low', 'medium', 'high'] },
                    news: { type: 'array', items: { type: 'object' } },
                    primary_asset: { type: 'string', example: 'BTC' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Unified decision response' },
            '400': { description: 'Invalid request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/v1/health': {
        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
      }
    }
  });
});

export default router;
