import { createApiInfoRouter } from '../../middleware/apiInfo';
export const actionInfoRouter = createApiInfoRouter({
  name: 'Agent Action Execution API', slug: 'action', version: '2.0.0',
  description: 'Execute, track, and audit structured actions for autonomous AI workflows. Supports research, outreach, web fetch, data extraction, API calls, and workflow steps with full execution metadata and audit trail.',
  category: 'Agent Infrastructure',
  endpoints: [
    { method: 'POST', path: '/execute', description: 'Execute a structured agent action', params: { action_type: 'research | outreach | web_fetch | data_extract | api_call | workflow_step', dry_run: 'true | false' } },
    { method: 'GET', path: '/types', description: 'List all supported action types with example payloads' },
    { method: 'GET', path: '/history', description: 'Get recent action execution history', params: { limit: 'Number of results (max 50)' } },
    { method: 'GET', path: '/:action_id', description: 'Get result and metadata for a specific action by ID' },
  ],
});
