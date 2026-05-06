import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Agent Memory API', version: '1.0.0', description: 'Persistent memory and context storage for AI agents — store, retrieve and search memories by session.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-memory' }],
    paths: {
      '/add': {
        post: {
          summary: 'Add memory to session',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string', description: 'Memory content to store (required, 1-10000 chars)' }, role: { type: 'string', description: 'Role — user|assistant|system (default: user)' }, tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags (max 10)' }, metadata: { type: 'object', description: 'Optional metadata object' } } } } } },
          responses: { '201': { description: 'Memory added' } }
        }
      },
      '/search': {
        post: {
          summary: 'Search memories by query',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id', 'query'], properties: { session_id: { type: 'string', description: 'Session ID to search (required)' }, query: { type: 'string', description: 'Search query (required, 1-500 chars)' } } } } } },
          responses: { '200': { description: 'Search results' } }
        }
      },
    },
  });
});

export default router;
