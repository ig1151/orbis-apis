export const PRICING = {
  tiers: {
    free:    { maxTokens: 1000,   priceUsd: 0.000 },
    small:   { maxTokens: 2000,   priceUsd: 0.010 },
    standard:{ maxTokens: 8000,   priceUsd: 0.025 },
    json:    { maxTokens: 8000,   priceUsd: 0.035 },
    large:   { maxTokens: 32000,  priceUsd: 0.070 },
    premium: { maxTokens: 128000, priceUsd: 0.100 },
    reasoning:{ maxTokens: 200000,priceUsd: 0.200 },
  },
  providerCostPer1kTokens: {
    'anthropic/claude-opus-4.7':          { input: 0.015,  output: 0.075  },
    'anthropic/claude-4.5-sonnet-20250929':{ input: 0.003,  output: 0.015  },
    'google/gemini-2.5-pro':              { input: 0.00125,output: 0.00375 },
    'google/gemini-2.5-flash':            { input: 0.00015,output: 0.0006  },
    'google/gemini-2.0-flash-001':        { input: 0.0001, output: 0.0004  },
    'openai/gpt-4.1':                     { input: 0.002,  output: 0.008   },
    'openai/gpt-4o-mini':                 { input: 0.00015,output: 0.0006  },
    'x-ai/grok-4.1-fast':                 { input: 0.003,  output: 0.009   },
    'deepseek/deepseek-chat':             { input: 0.00014,output: 0.00028 },
    'mistralai/mistral-large':            { input: 0.002,  output: 0.006   },
    'perplexity/sonar-pro':               { input: 0.003,  output: 0.015   },
  } as Record<string, { input: number; output: number }>,
  marginMultiplier: 2.5,
  freeTierDailyCallLimit: 50,
  dailySpendCapUsd: 100,
  maxTokenCapByTier: {
    free:      1000,
    developer: 8000,
    pro:       32000,
    scale:     128000,
    premium:   200000,
  },
  failoverPolicy: {
    maxProviderAttempts: 3,
    backoffMs: [500, 1000, 2000],
    fallbackOrder: [
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-001',
      'anthropic/claude-4.5-sonnet-20250929',
      'openai/gpt-4o-mini',
    ],
  },
  confidenceMethodology: {
    factors: ['provider_reliability', 'routing_confidence', 'cache_freshness', 'token_density'],
    description: 'Composite 0-1 score. >0.85=low risk, 0.6-0.85=medium, <0.6=high.',
  },
};

export type RoutingStrategy = 'cheapest' | 'fastest' | 'highest_quality' | 'balanced' | 'auto';

export const PROVIDER_STATUS: Record<string, string> = {
  google: 'healthy', openai: 'healthy', anthropic: 'healthy',
  xai: 'healthy', deepseek: 'healthy', mistralai: 'healthy', perplexity: 'healthy',
};

export function calcCost(modelSlug: string, inputTokens: number, outputTokens: number) {
  const rates = PRICING.providerCostPer1kTokens[modelSlug] ?? { input: 0.002, output: 0.008 };
  const providerCost = (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  const userPrice    = parseFloat((providerCost * PRICING.marginMultiplier).toFixed(6));
  const margin       = parseFloat((userPrice - providerCost).toFixed(6));
  return { providerCost: parseFloat(providerCost.toFixed(6)), userPrice, margin };
}

export function getPricingTier(maxTokens: number, jsonMode = false): string {
  if (jsonMode && maxTokens <= 8000) return 'json';
  if (maxTokens <= 1000)   return 'small';
  if (maxTokens <= 8000)   return 'standard';
  if (maxTokens <= 32000)  return 'large';
  if (maxTokens <= 128000) return 'premium';
  return 'reasoning';
}
