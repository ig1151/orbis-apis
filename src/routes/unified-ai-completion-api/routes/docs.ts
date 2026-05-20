import { Router, Request, Response } from 'express';
import { PRICING, PROVIDER_STATUS } from '../pricing.config';
import { MODELS } from '../config/models';

const router = Router();

const discoveryPayload = () => ({
  api_name:           'Unified Multi-Provider Agent Completion API',
  version:            '2.0.0',
  description:        'Premium multi-provider AI router. One endpoint for Claude Opus, Gemini Pro, GPT-4.1, Grok, and more. Agent-native, Orbis A+, x402 enabled.',
  status:             'operational',
  'x-agent-callable': true,
  'x-mcp-compatible': true,
  'x-orbis-compliance': 'A+',
  'x-x402-enabled':   true,
  available_models: Object.values(MODELS).filter(m => m.enabled).map(m => ({
    alias:          m.alias,
    displayName:    m.displayName,
    provider:       m.provider,
    resolvedSlug:   m.modelSlug,
    costTier:       m.costTier,
    maxInputTokens: m.maxInputTokens,
    supportsJson:   m.supportsJsonMode,
    supportsTools:  m.supportsToolCalling,
  })),
  routing_strategies: ['auto', 'cheapest', 'fastest', 'highest_quality', 'balanced'],
  capabilities: [
    'multi_provider_routing', 'premium_frontier_models', 'cost_optimization',
    'json_mode', 'tool_calling', 'response_caching', 'retry_with_backoff',
    'usage_metering', 'confidence_scoring', 'agent_chain_routing',
    'provider_failover', 'exponential_backoff', 'token_capping',
  ],
  pricing: {
    currency: 'USD',
    unit: 'request',
    tiers: PRICING.tiers,
  },
  auth_requirements: {
    type: 'api_key',
    header: 'x-api-key',
    note: 'Pass your Orbis API key. Provider keys managed server-side.',
  },
  privacy: {
    data_retained: false,
    retention_policy: 'none by this API',
    training_use: false,
    pii_scrubbed: true,
    third_party_processors: ['Google Gemini', 'OpenAI', 'Anthropic', 'xAI', 'Mistral', 'DeepSeek'],
    note: 'Requests processed by upstream providers under their API terms.',
  },
  confidence_methodology: PRICING.confidenceMethodology,
  failover_policy:        PRICING.failoverPolicy,
  provider_status:        PROVIDER_STATUS,
  execution_gate: { required: false, note: 'No gate required. All endpoints callable directly.' },
  recommended_actions_priority_order: [
    { priority: 1, action: 'call_completion',  endpoint: 'POST /api/unified-ai/v1/chat/completions', reason: 'Primary use case' },
    { priority: 2, action: 'discover_models',  endpoint: 'GET /api/unified-ai/',                    reason: 'Check models and pricing' },
    { priority: 3, action: 'check_health',     endpoint: 'GET /api/unified-ai/health',              reason: 'Verify provider availability' },
  ],
  chain_to: [
    { api: 'sentiment',         endpoint: 'POST /api/sentiment',         reason: 'Analyze tone',            priority: 1 },
    { api: 'entity-extraction', endpoint: 'POST /api/entity-extraction', reason: 'Extract entities',         priority: 2 },
    { api: 'fact-verification', endpoint: 'POST /api/fact-verification', reason: 'Verify factual claims',    priority: 3 },
    { api: 'unified-ai',        endpoint: 'POST /api/unified-ai/v1/chat/completions', reason: 'Multi-step chaining', priority: 4 },
  ],
  endpoints: [
    { method: 'GET',  path: '/api/unified-ai/',                    description: 'Discovery manifest' },
    { method: 'GET',  path: '/api/unified-ai/manifest',            description: 'Manifest alias' },
    { method: 'POST', path: '/api/unified-ai/v1/chat/completions', description: 'Premium multi-provider completion' },
    { method: 'GET',  path: '/api/unified-ai/health',              description: 'Provider health status' },
  ],
  x402_payment: {
    enabled: true,
    wallet:  process.env.X402_RECEIVING_WALLET ?? 'not-configured',
    accepted_tokens: ['USDC', 'ETH'],
  },
  rate_limits: {
    free:       '50 calls/day',
    paid:       '10000 calls/day',
    enterprise: 'unlimited',
    headers:    ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  },
});

router.get('/',        (_req: Request, res: Response) => res.json(discoveryPayload()));
router.get('/manifest',(_req: Request, res: Response) => res.json(discoveryPayload()));

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider_status: PROVIDER_STATUS,
    uptime_seconds: process.uptime(),
    failover_policy: PRICING.failoverPolicy,
    model_count: Object.values(MODELS).filter(m => m.enabled).length,
  });
});

router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'Unified Multi-Provider Agent Completion API',
    slug: 'unified-ai-completion-api',
    version: '2.0.0',
    grade: 'A+',
    orbisCompliance: 'A+',
    agentCallable: true,
    mcpCompatible: true,
    x402Enabled: true,
    executionGateRequired: false,
    confidence: 0.97,
    category: 'AI / LLM Infrastructure',
    baseRoute: '/api/unified-ai',
  });
});

export default router;
