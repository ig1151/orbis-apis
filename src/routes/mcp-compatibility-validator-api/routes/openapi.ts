import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'MCP Compatibility Validator API', version: '1.0.0', description: 'Validate MCP (Model Context Protocol) tool and server definitions for compatibility with AI agents.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/mcp-compatibility-validator' }],
    paths: {
      '/validate': { post: { summary: 'Validate an MCP server or tool definition', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'MCP server definition JSON or URL' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Validation result' } } } },
      '/check': { post: { summary: 'Check MCP compatibility with AI clients', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Compatibility check result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/mcp-intelligence': { post: { summary: 'ONE-CALL: Full MCP compatibility intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
