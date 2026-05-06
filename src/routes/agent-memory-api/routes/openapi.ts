import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Agent Memory API', version: '1.0.0', description: 'Persistent memory and context storage for AI agents — store, retrieve and search memories by session.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-memory' }],
    paths: {
      '/store': {
        post: {
          summary: 'Store a memory entry with tags and importance score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'content'], properties: {
            agent_id: { type: 'string', description: 'Unique agent identifier (required)' },
            content: { type: 'string', description: 'Memory content (required)' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags (optional)' },
            importance: { type: 'number', description: 'Importance score 0-1 (optional)' }
          } } } } },
          responses: { '201': { description: 'Memory stored' } }
        }
      },
      '/retrieve': {
        post: {
          summary: 'Retrieve relevant memories by query and filters',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'query'], properties: {
            agent_id: { type: 'string', description: 'Agent identifier (required)' },
            query: { type: 'string', description: 'Search query (required)' },
            limit: { type: 'number', description: 'Max results (optional)' }
          } } } } },
          responses: { '200': { description: 'Memory results' } }
        }
      },
      '/search': {
        post: {
          summary: 'Search memories across a session by keyword',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id', 'query'], properties: {
            session_id: { type: 'string', description: 'Session identifier (required)' },
            query: { type: 'string', description: 'Search query (required)' },
            limit: { type: 'number', description: 'Max results (optional)' }
          } } } } },
          responses: { '200': { description: 'Search results' } }
        }
      },
      '/compress': {
        post: {
          summary: 'Compress long memory history into a structured summary',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_id'], properties: {
            agent_id: { type: 'string', description: 'Agent identifier (required)' }
          } } } } },
          responses: { '200': { description: 'Compressed summary' } }
        }
      },
      '/extract': {
        post: {
          summary: 'Extract facts, entities or summary from memory content',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: {
            content: { type: 'string', description: 'Text to extract from (required)' },
            type: { type: 'string', description: 'Extraction type — facts|entities|summary (optional)' }
          } } } } },
          responses: { '200': { description: 'Extracted data' } }
        }
      },
    },
  });
});

export default router;
