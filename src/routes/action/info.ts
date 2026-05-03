import { createApiInfoRouter } from '../../middleware/apiInfo';
export const actionInfoRouter = createApiInfoRouter({
  name: 'Action Executor API', slug: 'action', version: '2.0.0',
  description: 'Structured task execution engine for autonomous agents. Execute web fetches, API calls, and data transforms with deterministic, loop-friendly outputs.',
  category: 'Agent Infrastructure',
  endpoints: [
    { method: 'POST', path: '/execute', description: 'Execute a structured task', params: { task_type: 'web_fetch | api_call | data_transform', dry_run: 'true | false (simulate without executing)' } },
    { method: 'GET', path: '/task-types', description: 'List supported task types with example payloads' },
  ],
});
