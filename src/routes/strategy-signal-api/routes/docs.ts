import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Strategy Signal API',
    version: '1.0.0',
    description: 'Unified crypto strategy decisions — combines funding rates, prediction market probabilities, and price momentum into a single BUY/SELL/HOLD signal with confidence score. Calls funding-rate-api + prediction-market-api + CoinGecko in parallel, then synthesizes with Claude AI. Flagship pipeline API.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://strategy-signal-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check with pipeline status', responses: { 200: { description: 'OK' } } } },
    '/v1/strategy': {
      get: {
        summary: 'Unified BUY/SELL/HOLD decision from 3-signal pipeline',
        operationId: 'getStrategy',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'OP', 'AVAX', 'MATIC', 'LINK', 'UNI', 'DOGE', 'SUI', 'APT', 'SEI', 'INJ', 'TIA', 'ATOM', 'DOT', 'NEAR', 'FET'] },
            description: 'Crypto symbol',
          },
          {
            name: 'predictionQuery',
            in: 'query',
            schema: { type: 'string' },
            description: 'Custom Polymarket search query (defaults to symbol name)',
          },
        ],
        responses: {
          200: {
            description: 'Unified strategy decision with confidence score, signal breakdown, and action guidance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        symbol: { type: 'string' },
                        decision: { type: 'string', enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'] },
                        confidence: { type: 'number', description: '0-1 confidence score' },
                        signalScore: { type: 'number', description: '-100 to +100' },
                        reasoning: { type: 'string' },
                        keyFactors: { type: 'array', items: { type: 'string' } },
                        risks: { type: 'array', items: { type: 'string' } },
                        action: {
                          type: 'object',
                          properties: {
                            bias: { type: 'string' },
                            suggestedSize: { type: 'string', enum: ['large', 'moderate', 'small', 'none'] },
                            timeframe: { type: 'string' },
                            stopLossHint: { type: 'string', nullable: true },
                          },
                        },
                        signals: {
                          type: 'object',
                          properties: {
                            funding: { type: 'object', nullable: true },
                            prediction: { type: 'object', nullable: true },
                            price: { type: 'object', nullable: true },
                          },
                        },
                        pipeline: { type: 'object' },
                        analyzedAt: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Strategy Signal API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
