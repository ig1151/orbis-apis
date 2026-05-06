import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Extraction API', version: '1.0.0', description: 'Task-specific AI extraction APIs — leads, invoices, resumes, contracts and custom schemas.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/extraction' }],
    paths: {
      '/extract/invoice': { post: { summary: 'Extract invoice data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'Invoice text to extract from (required, 10-50000 chars)' } } } } } }, responses: { '200': { description: 'Extracted invoice' } } } },
      '/extract/lead': { post: { summary: 'Extract lead data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'Lead text to extract from (required)' } } } } } }, responses: { '200': { description: 'Extracted lead' } } } },
      '/extract/resume': { post: { summary: 'Extract resume data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'Resume text to extract from (required)' } } } } } }, responses: { '200': { description: 'Extracted resume' } } } },
      '/extract/contract': { post: { summary: 'Extract contract data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'Contract text to extract from (required)' } } } } } }, responses: { '200': { description: 'Extracted contract' } } } },
      '/extract/custom': { post: { summary: 'Extract with custom schema', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'schema'], properties: { text: { type: 'string', description: 'Text to extract from (required)' }, schema: { type: 'object', description: 'Custom schema object (required)' }, context: { type: 'string', description: 'Optional context hint' } } } } } }, responses: { '200': { description: 'Extracted data' } } } },
    },
  });
});

export default router;
