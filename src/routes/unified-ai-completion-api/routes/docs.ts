import { Router, Request, Response } from 'express';
import { PRICING, MODEL_ALIAS_MAP, PROVIDER_STATUS } from '../pricing.config';

const router = Router();

const discoveryPayload = () => ({
  api_name: 'Unified Multi-Provider Agent Completion API',
  version: '1.0.0',
  description: 'Route AI completions across Gemini, OpenAI, Claude, Grok, Mistral, DeepSeek, and more. Single endpoint, unified schema, cost-transparent, agent-native.',
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
    'multi_provider_routing', 'cost_optimization', 'json_mode',
    'tool_calling', 'response_caching', 'retry_with_backoff',
    'usage_metering', 'confidence_scoring', 'agent_chain_routing',
    'provider_failover', 'execution_gating',
  ],
  routing_strategies: ['auto', 'cheapest', 'fastest', 'highest_quality', 'balanced'],
  pricing: {
    currency: 'USD',
    unit: 'request',
    tiers: {
      free:              { price: 0.000, limit: `${PRICING.freeTierDailyCallLimit} calls/day`, maxTokens: PRICING.tiers.free.maxTokens },
      small:             { price: PRICING.tiers.small.priceUsd,   maxTokens: PRICING.tiers.small.maxTokens   },
      medium:            { price: PRICING.tiers.medium.priceUsd,  maxTokens: PRICING.tiers.medium.maxTokens  },
      large:             { price: PRICING.tiers.large.priceUsd,   maxTokens: PRICING.tiers.large.maxTokens   },
      premium_reasoning: { price: PRICING.tiers.premium.priceUsd, maxTokens: PRICING.tiers.premium.maxTokens },
    },
  },
  auth_requirements: {
    type: 'api_key',
    header: 'x-api-key',
    note: 'Pass your Orbis API key. Provider keys managed server-side.',
  },
  privacy: {
    data_retained: false,
    retention_policy: 'none — request lifecycle only',
    training_use: false,
    pii_scrubbed: true,
    third_party_processors: ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'DeepSeek'],
    compliance: 'GDPR-aligned, no persistent storage',
  },
  confidence_methodology: PRICING.confidenceMethodology,
  failover_policy: PRICING.failoverPolicy,
  execution_gate: {
    required: false,
    note: 'No execution gate required. All endpoints are safe to call directly.',
  },
  provider_status: PROVIDER_STATUS,
  recommended_actions_priority_order: [
    { priority: 1, action: 'call_completion',  endpoint: 'POST /api/unified-ai/v1/chat/completions', reason: 'Primary use case' },
    { priority: 2, action: 'discover_models',  endpoint: 'GET /api/unified-ai/',                    reason: 'Check available models and pricing' },
    { priority: 3, action: 'health_check',     endpoint: 'GET /api/unified-ai/health',              reason: 'Verify provider availability before batch calls' },
  ],
  chain_to: [
    { api: 'sentiment',          endpoint: 'POST /api/sentiment',          reason: 'Analyze tone of completion output',      priority: 1 },
    { api: 'entity-extraction',  endpoint: 'POST /api/entity-extraction',  reason: 'Extract entities from completion output', priority: 2 },
    { api: 'fact-verification',  endpoint: 'POST /api/fact-verification',  reason: 'Verify factual claims in output',         priority: 3 },
    { api: 'unified-ai',         endpoint: 'POST /api/unified-ai/v1/chat/completions', reason: 'Chain completions for multi-step reasoning', priority: 4 },
  ],
  endpoints: [
    { method: 'GET',  path: '/api/unified-ai/',                     description: 'Discovery manifest — models, pricing, capabilities', execution_gate_required: false },
    { method: 'GET',  path: '/api/unified-ai/manifest',             description: 'Alias for discovery',                               execution_gate_required: false },
    { method: 'POST', path: '/api/unified-ai/v1/chat/completions',  description: 'Unified multi-provider chat completion',            execution_gate_required: false },
    { method: 'GET',  path: '/api/unified-ai/health',               description: 'Provider health and uptime status',                 execution_gate_required: false },
    { method: 'GET',  path: '/api/unified-ai/info',                 description: 'Orbis listing metadata',                           execution_gate_required: false },
  ],
  x402_payment: {
    enabled: true,
    wallet: process.env.X402_RECEIVING_WALLET ?? 'not-configured',
    accepted_tokens: ['USDC', 'ETH'],
  },
  rate_limits: {
    free:       '50 calls/day',
    paid:       '10000 calls/day',
    enterprise: 'unlimited',
    headers:    ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  },
});

// ── GET / (root discovery) ───────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  res.json(discoveryPayload());
});

// ── GET /manifest (alias) ────────────────────────────────────────────────────
router.get('/manifest', (_req: Request, res: Response) => {
  res.json(discoveryPayload());
});

// ── GET /health ──────────────────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider_status: PROVIDER_STATUS,
    uptime_seconds: process.uptime(),
    failover_policy: PRICING.failoverPolicy,
  });
});

// ── GET /info ────────────────────────────────────────────────────────────────
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'Unified Multi-Provider Agent Completion API',
    slug: 'unified-ai-completion-api',
    version: '1.0.0',
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
