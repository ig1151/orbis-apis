import { Router, Request, Response } from 'express';
export const actionTaskTypesRouter = Router();

actionTaskTypesRouter.get('/types', (_req: Request, res: Response) => {
  res.json({
    success: true,
    action_types: [
      { type: 'web_fetch', description: 'Fetch and extract data from a URL', example: { action_type: 'web_fetch', input: { url: 'https://api.coingecko.com/api/v3/ping', extract_fields: ['gecko_says'] } } },
      { type: 'api_call', description: 'Call an external API and normalize the response', example: { action_type: 'api_call', input: { url: 'https://api.coingecko.com/api/v3/simple/price', method: 'GET', params: { ids: 'bitcoin', vs_currencies: 'usd' } } } },
      { type: 'data_extract', description: 'Fetch a URL and extract specific fields', example: { action_type: 'data_extract', input: { url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', extract_fields: ['ethereum'] } } },
      { type: 'research', description: 'Log a research task and get suggested APIs', example: { action_type: 'research', input: { query: 'Find undervalued AI tokens' } } },
      { type: 'outreach', description: 'Log an outreach action with recipient and subject', example: { action_type: 'outreach', input: { recipient: 'agent@example.com', subject: 'Partnership opportunity' } } },
      { type: 'workflow_step', description: 'Log a workflow step with next step chaining', example: { action_type: 'workflow_step', input: { step: 1, label: 'fetch_data', next_step: 'analyze_data' } } },
    ],
  });
});
