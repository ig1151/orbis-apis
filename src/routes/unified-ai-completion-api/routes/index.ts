// @ts-nocheck
import { Router } from 'express';
import { PRICING, calcCost, getPricingTier, PROVIDER_STATUS } from '../pricing.config';
import { MODELS, resolveAlias } from '../config/models';
import { callProvider } from '../providers/index';

const router = Router();

// ── In-memory rate limiting ───────────────────────────────────────────────────
const usageStore = new Map();
function getUserUsage(userId) {
  const now = Date.now();
  let rec = usageStore.get(userId);
  if (!rec || now > rec.resetAt) {
    rec = { calls: 0, spend: 0, resetAt: now + 86400_000 };
    usageStore.set(userId, rec);
  }
  return rec;
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const completionCache = new Map();
function cacheGet(key) {
  const e = completionCache.get(key);
  if (!e || Date.now() > e.expiresAt) return null;
  return e.value;
}
function cacheSet(key, value, ttlMs = 300_000) {
  completionCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ── Agent metadata ────────────────────────────────────────────────────────────
function agentMeta(confidence, providerCost, maxTokens, jsonMode) {
  return {
    execution_risk: confidence > 0.85 ? 'low' : confidence > 0.6 ? 'medium' : 'high',
    execution_gate_required: false,
    privacy: {
      data_retained: false,
      retention_hours: 0,
      training_use: false,
      pii_scrubbed: true,
      note: 'No persistent storage by this API. Requests processed by upstream providers under their API terms.',
    },
    recommended_actions_priority_order: [
      { priority: 1, action: 'use_output',              description: 'Use the completion output directly' },
      { priority: 2, action: 'retry_if_low_confidence', description: 'Retry with higher quality model if confidence < 0.7' },
      { priority: 3, action: 'chain_to_tool',           description: 'Pass output to a downstream tool or agent' },
    ],
    chain_to: [
      { api: 'sentiment',         endpoint: 'POST /api/sentiment',         reason: 'Analyze tone of output',      priority: 1 },
      { api: 'entity-extraction', endpoint: 'POST /api/entity-extraction', reason: 'Extract entities from output', priority: 2 },
      { api: 'fact-verification', endpoint: 'POST /api/fact-verification', reason: 'Verify factual claims',        priority: 3 },
      { api: 'unified-ai',        endpoint: 'POST /api/unified-ai/v1/chat/completions', reason: 'Chain for multi-step reasoning', priority: 4 },
    ],
    cost_estimate: {
      tier: getPricingTier(maxTokens, jsonMode),
      provider_cost_usd: providerCost,
    },
  };
}

// ── POST /v1/chat/completions ─────────────────────────────────────────────────
router.post('/v1/chat/completions', async (req, res) => {
  const startMs = Date.now();
  const {
    model = 'auto',
    messages,
    temperature = 0.7,
    max_tokens = 1000,
    json_mode = false,
    tools,
    routing_strategy = 'auto',
    user_id = 'anonymous',
    cache_policy = 'standard',
  } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Rate limiting
  const usage = getUserUsage(user_id);
  if (usage.calls >= PRICING.freeTierDailyCallLimit) {
    return res.status(429).json({ error: 'Daily call limit reached', limit: PRICING.freeTierDailyCallLimit, reset_at: new Date(usage.resetAt).toISOString() });
  }
  if (usage.spend >= PRICING.dailySpendCapUsd) {
    return res.status(429).json({ error: 'Daily spend cap reached', cap_usd: PRICING.dailySpendCapUsd });
  }

  // Resolve model
  const requestedModel = model;
  const resolved = resolveAlias(routing_strategy !== 'auto' ? routing_strategy : model);
  const modelSlug = resolved.modelSlug;

  // Cap tokens
  const cappedTokens = Math.min(max_tokens, resolved.maxOutputTokens);

  // Cache
  const cacheKey = cache_policy !== 'no-cache'
    ? JSON.stringify({ modelSlug, messages, temperature, cappedTokens, json_mode })
    : null;
  if (cacheKey) {
    const hit = cacheGet(cacheKey);
    if (hit) return res.json({ ...hit, cache_hit: true, latency_ms: Date.now() - startMs });
  }

  // Call provider
  let providerResult;
  try {
    providerResult = await callProvider({
      modelSlug,
      messages,
      temperature,
      max_tokens: cappedTokens,
      jsonMode: json_mode,
      tools,
    });
  } catch (err) {
    return res.status(502).json({ error: 'All upstream provider attempts failed', detail: String(err) });
  }

  const { content, inputTokens, outputTokens, totalTokens } = providerResult;
  const costs      = calcCost(modelSlug, inputTokens, outputTokens);
  const confidence = Math.min(0.99, 0.75 + (outputTokens > 50 ? 0.1 : 0) + (temperature < 0.5 ? 0.1 : 0));

  usage.calls++;
  usage.spend += costs.userPrice;

  // Parse structured output
  let structured_output = null;
  if (json_mode) {
    try {
      const stripped = content.replace(/```json\s*|```\s*/g, '').trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      structured_output = match ? JSON.parse(match[0]) : null;
    } catch { structured_output = null; }
  }

  const result = {
    id:                      `uai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    object:                  'chat.completion',
    output:                  content,
    structured_output,
    provider_used:           resolved.provider,
    model_used:              resolved.displayName,
    requested_model:         requestedModel,
    resolved_model_slug:     modelSlug,
    routing_strategy_applied: routing_strategy,
    confidence,
    token_usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens },
    pricing: {
      estimated_provider_cost_usd: costs.providerCost,
      user_price_usd:              costs.userPrice,
      profit_margin_usd:           costs.margin,
      tier:                        getPricingTier(cappedTokens, json_mode),
      currency:                    'USD',
    },
    latency_ms:  Date.now() - startMs,
    cache_hit:   false,
    ...agentMeta(confidence, costs.providerCost, cappedTokens, json_mode),
  };

  if (cacheKey) cacheSet(cacheKey, result);

  res.setHeader('X-RateLimit-Remaining', String(PRICING.freeTierDailyCallLimit - usage.calls));
  res.setHeader('X-RateLimit-Reset',     String(Math.floor(usage.resetAt / 1000)));
  return res.json(result);
});

router.get('/', (_req, res) => res.json({ name: 'unified-ai-completion', health: 'ok' }));
export default router;
