import { Router, Request, Response } from 'express';
import { PRICING, MODEL_ALIAS_MAP } from '../pricing.config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    api_name: 'Unified Multi-Provider Agent Completion API',
    version: '1.0.0',
    description: 'Route AI completions across Gemini, OpenAI, Claude, Grok, Mistral, DeepSeek, and more. Single endpoint, unified response schema, cost-transparent, agent-native.',
    status: 'operational',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x-orbis-compliance': 'A+',
    'x-x402-enabled': true,
    available_models: Object.keys(MODEL_ALIAS_MAP).map(alias => ({
      alias,
      resolved: MODEL_ALIAS_MAP[alias],
      available: true,
    })),
    capabilities: [
      'multi_provider_routing',
      'cost_optimization',
      'json_mode',
      'tool_calling',
      'response_caching',
      'retry_with_backoff',
      'usage_metering',
      'confidence_scoring',
      'agent_chain_routing',
    ],
    routing_strategies: ['auto', 'cheapest', 'fastest', 'highest_quality', 'balanced'],
    pricing: {
      small:            `$${PRICING.tiers.small.priceUsd}  (up to ${PRICING.tiers.small.maxTokens} tokens)`,
      medium:           `$${PRICING.tiers.medium.priceUsd} (up to ${PRICING.tiers.medium.maxTokens} tokens)`,
      large:            `$${PRICING.tiers.large.priceUsd}  (up to ${PRICING.tiers.large.maxTokens} tokens)`,
      premium_reasoning:`$${PRICING.tiers.premium.priceUsd} (up to ${PRICING.tiers.premium.maxTokens} tokens)`,
      free_tier:        `${PRICING.freeTierDailyCallLimit} calls/day free`,
    },
    auth_requirements: {
      type: 'api_key',
      header: 'x-api-key',
      note: 'Pass your Orbis API key. OpenRouter key used server-side.',
    },
    privacy_summary: 'Inputs and outputs are not stored beyond the request lifecycle. No user data used for training. PII scrubbing enabled.',
    recommended_actions_priority_order: [
      { priority: 1, action: 'call_completion',   endpoint: 'POST /api/unified-ai/v1/chat/completions' },
      { priority: 2, action: 'check_models',       endpoint: 'GET /api/unified-ai/' },
      { priority: 3, action: 'check_health',       endpoint: 'GET /api/unified-ai/health' },
    ],
    chain_to: [
      'POST /api/unified-ai/v1/chat/completions',
      'POST /api/sentiment',
      'POST /api/entity-extraction',
    ],
    endpoints: [
      { method: 'GET',  path: '/api/unified-ai/',                        description: 'Discovery — models, capabilities, pricing' },
      { method: 'POST', path: '/api/unified-ai/v1/chat/completions',     description: 'Unified multi-provider chat completion' },
      { method: 'GET',  path: '/api/unified-ai/health',                  description: 'Health check' },
      { method: 'GET',  path: '/api/unified-ai/info',                    description: 'Orbis API metadata' },
    ],
    x402_payment: {
      enabled: true,
      wallet: process.env.X402_RECEIVING_WALLET ?? 'not-configured',
      accepted_tokens: ['USDC', 'ETH'],
    },
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers_available: ['google/gemini-pro', 'google/gemini-flash', 'anthropic/claude-sonnet-4-5'],
    uptime_seconds: process.uptime(),
  });
});

export default router;
