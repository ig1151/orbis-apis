import { Router, Request, Response } from 'express';
import axios from 'axios';
import { PRICING, ROUTING_MAP, MODEL_ALIAS_MAP, RoutingStrategy } from '../pricing.config';

const router = Router();

// ── In-memory rate limiting & metering ──────────────────────────────────────
const usageStore = new Map<string, { calls: number; spend: number; resetAt: number }>();

function getUserUsage(userId: string) {
  const now = Date.now();
  let rec = usageStore.get(userId);
  if (!rec || now > rec.resetAt) {
    rec = { calls: 0, spend: 0, resetAt: now + 86400_000 };
    usageStore.set(userId, rec);
  }
  return rec;
}

// ── Simple in-memory cache ───────────────────────────────────────────────────
const completionCache = new Map<string, { value: unknown; expiresAt: number }>();

function cacheGet(key: string) {
  const entry = completionCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value;
}
function cacheSet(key: string, value: unknown, ttlMs = 300_000) {
  completionCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ── Cost calculator ──────────────────────────────────────────────────────────
function calcCost(model: string, inputTokens: number, outputTokens: number) {
  const rates = PRICING.providerCostPer1kTokens[model as keyof typeof PRICING.providerCostPer1kTokens]
    ?? { input: 0.002, output: 0.008 };
  const providerCost = (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  const userPrice = parseFloat((providerCost * PRICING.marginMultiplier).toFixed(6));
  const margin = parseFloat((userPrice - providerCost).toFixed(6));
  return { providerCost: parseFloat(providerCost.toFixed(6)), userPrice, margin };
}

function getPricingTier(maxTokens: number) {
  if (maxTokens <= 1000)  return 'small';
  if (maxTokens <= 8000)  return 'medium';
  if (maxTokens <= 32000) return 'large';
  return 'premium';
}

function resolveModel(model: string, strategy: RoutingStrategy): string {
  if (strategy && strategy !== 'auto') return ROUTING_MAP[strategy];
  return MODEL_ALIAS_MAP[model] ?? model;
}

function agentFields(confidence: number, model: string, providerCost: number) {
  return {
    confidence,
    execution_risk: confidence > 0.85 ? 'low' : confidence > 0.6 ? 'medium' : 'high',
    privacy: {
      data_retained: false,
      retention_hours: 0,
      training_use: false,
      pii_scrubbed: true,
    },
    recommended_actions_priority_order: [
      { priority: 1, action: 'use_output',      description: 'Use the completion output directly' },
      { priority: 2, action: 'retry_if_low_confidence', description: 'Retry with higher quality model if confidence < 0.7' },
      { priority: 3, action: 'chain_to_tool',   description: 'Pass output to a downstream tool or agent' },
    ],
    chain_to: [
      'POST /v1/chat/completions',
      'POST /api/sentiment',
      'POST /api/entity-extraction',
      'POST /api/fact-verification',
    ],
    cost_estimate: {
      tier: getPricingTier(1000),
      provider_cost_usd: providerCost,
    },
  };
}

// ── POST /v1/chat/completions ────────────────────────────────────────────────
router.post('/v1/chat/completions', async (req: Request, res: Response) => {
  const startMs = Date.now();
  const {
    model = 'auto',
    messages,
    temperature = 0.7,
    max_tokens = 1000,
    json_mode = false,
    tools,
    routing_strategy = 'auto' as RoutingStrategy,
    user_id = 'anonymous',
    cache_policy = 'standard',
  } = req.body as {
    model?: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
    tools?: unknown[];
    routing_strategy?: RoutingStrategy;
    user_id?: string;
    cache_policy?: string;
  };

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

  const resolvedModel = resolveModel(model, routing_strategy as RoutingStrategy);
  const cacheKey = cache_policy !== 'no-cache' ? JSON.stringify({ resolvedModel, messages, temperature, max_tokens, json_mode }) : null;

  if (cacheKey) {
    const hit = cacheGet(cacheKey);
    if (hit) {
      const cached = hit as Record<string, unknown>;
      return res.json({ ...cached, cache_hit: true, latency_ms: Date.now() - startMs });
    }
  }

  const systemMessages = json_mode
    ? [{ role: 'system', content: 'You must respond only with valid JSON. No markdown, no explanation.' }]
    : [];

  const bodyPayload: Record<string, unknown> = {
    model: resolvedModel,
    max_tokens,
    temperature,
    messages: [...systemMessages, ...messages],
  };
  if (tools?.length) bodyPayload.tools = tools;

  // Retry with backoff
  let lastError: unknown;
  let rawResponse: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        bodyPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://orbis-apis.onrender.com',
            'X-Title': 'Orbis Unified AI API',
          },
          timeout: 30_000,
        }
      );
      rawResponse = response.data;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  if (!rawResponse) {
    return res.status(502).json({ error: 'All upstream provider attempts failed', detail: String(lastError) });
  }

  const data = rawResponse as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content ?? '';
  const usage_tokens = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const costs = calcCost(resolvedModel, usage_tokens.prompt_tokens, usage_tokens.completion_tokens);
  const confidence = Math.min(0.99, 0.75 + (usage_tokens.completion_tokens > 50 ? 0.1 : 0) + (temperature < 0.5 ? 0.1 : 0));

  // Update usage metering
  usage.calls++;
  usage.spend += costs.userPrice;

  let structured_output: unknown = null;
  if (json_mode) {
    try {
      const stripped = content.replace(/```json\s*|```\s*/g, '').trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      structured_output = match ? JSON.parse(match[0]) : null;
    } catch { structured_output = null; }
  }

  const providerShort = resolvedModel.split('/')[0];
  const modelShort    = resolvedModel.split('/')[1] ?? resolvedModel;
  const latency_ms    = Date.now() - startMs;

  const result = {
    id: `uai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    object: 'chat.completion',
    output: content,
    structured_output,
    provider_used: providerShort,
    model_used: modelShort,
    routing_strategy_applied: routing_strategy,
    confidence,
    token_usage: {
      input_tokens:  usage_tokens.prompt_tokens,
      output_tokens: usage_tokens.completion_tokens,
      total_tokens:  usage_tokens.total_tokens,
    },
    pricing: {
      estimated_provider_cost_usd: costs.providerCost,
      user_price_usd:              costs.userPrice,
      profit_margin_usd:           costs.margin,
      tier:                        getPricingTier(max_tokens),
    },
    latency_ms,
    cache_hit: false,
    ...agentFields(confidence, resolvedModel, costs.providerCost),
  };

  if (cacheKey) cacheSet(cacheKey, result);

  return res.json(result);
});

export default router;
