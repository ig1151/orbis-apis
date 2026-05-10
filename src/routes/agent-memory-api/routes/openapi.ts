import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Memory & Context Engine',
      version: '2.0.0',
      description: 'Structured memory storage, retrieval, compression and extraction for autonomous AI agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/store': 0.0015, '/retrieve': 0.001, '/search': 0.001, '/compress': 0.002, '/extract': 0.0015, '/sessions': 0.0005 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-memory' }],
    paths: {
      '/store': { post: { operationId: 'storeMemory', summary: 'Store a memory entry', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: {
          content: { type: 'string' }, agent_id: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
          importance: { type: 'number', minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Memory stored', content: { 'application/json': { schema: { type: 'object', properties: {
          id: { type: 'string' }, stored: { type: 'boolean' }, confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/retrieve': { post: { operationId: 'retrieveMemory', summary: 'Retrieve memories by query', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: {
          query: { type: 'string' }, agent_id: { type: 'string' }, limit: { type: 'integer', default: 10 },
        }}}}},
        responses: { '200': { description: 'Matching memories' }}}},
      '/search': { post: { operationId: 'searchMemory', summary: 'Search memories by keyword', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { session_id: { type: 'string' }, query: { type: 'string' }, limit: { type: 'integer' } }}}}},
        responses: { '200': { description: 'Search results' }}}},
      '/compress': { post: { operationId: 'compressMemory', summary: 'Compress memory history into summary', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }}}},
        responses: { '200': { description: 'Compressed summary' }}}},
      '/extract': { post: { operationId: 'extractMemory', summary: 'Extract facts, entities or summary', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content', 'type'], properties: {
          content: { type: 'string' }, type: { type: 'string', enum: ['facts', 'entities', 'summary'] },
        }}}}},
        responses: { '200': { description: 'Extracted data' }}}},
      '/sessions': { get: { operationId: 'listSessions', summary: 'List all active memory sessions', 'x-agent-callable': true,
        responses: { '200': { description: 'Session list' }}}},
    },
  });
});
export default router;
