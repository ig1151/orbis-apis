import { Router, Request, Response } from 'express';
export const actionTaskTypesRouter = Router();

actionTaskTypesRouter.get('/task-types', (_req: Request, res: Response) => {
  res.json({
    success: true,
    task_types: [
      {
        type: 'web_fetch',
        description: 'Fetch and extract data from a URL',
        example: {
          task_type: 'web_fetch',
          input: { url: 'https://api.coingecko.com/api/v3/ping', extract_fields: ['gecko_says'] },
          constraints: { timeout: 10 },
        },
      },
      {
        type: 'api_call',
        description: 'Call an external API and normalize the response',
        example: {
          task_type: 'api_call',
          input: { url: 'https://api.coingecko.com/api/v3/simple/price', method: 'GET', params: { ids: 'bitcoin', vs_currencies: 'usd' } },
          constraints: { timeout: 10 },
        },
      },
      {
        type: 'data_transform',
        description: 'Transform JSON data with filter, map, aggregate or sort',
        example: {
          task_type: 'data_transform',
          input: {
            data: [{ symbol: 'BTC', price: 60000 }, { symbol: 'ETH', price: 3000 }],
            operation: 'filter',
            options: { field: 'price', operator: 'gt', value: 5000 },
          },
        },
      },
    ],
  });
});
