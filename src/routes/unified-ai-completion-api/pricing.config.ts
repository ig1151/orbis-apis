export const PRICING = {
  tiers: {
    free:    { maxTokens: 1000,  priceUsd: 0.000 },
    small:   { maxTokens: 2000,  priceUsd: 0.010 },
    medium:  { maxTokens: 8000,  priceUsd: 0.025 },
    large:   { maxTokens: 32000, priceUsd: 0.070 },
    premium: { maxTokens: 128000,priceUsd: 0.150 },
  },
  providerCostPer1kTokens: {
    'google/gemini-pro':            { input: 0.00125, output: 0.00375 },
    'google/gemini-flash':          { input: 0.000075, output: 0.0003 },
    'openai/gpt-4.1':               { input: 0.002,   output: 0.008  },
    'openai/gpt-4o-mini':           { input: 0.00015, output: 0.0006 },
    'anthropic/claude-sonnet-4-5':  { input: 0.003,   output: 0.015  },
    'mistralai/mistral-large':      { input: 0.002,   output: 0.006  },
    'deepseek/deepseek-chat':       { input: 0.00014, output: 0.00028},
    'x-ai/grok-3':                  { input: 0.003,   output: 0.015  },
    'perplexity/sonar-pro':         { input: 0.003,   output: 0.015  },
  },
  marginMultiplier: 2.5,
  freeTierDailyCallLimit: 50,
  dailySpendCapUsd: 100,
};

export type RoutingStrategy = 'cheapest' | 'fastest' | 'highest_quality' | 'balanced' | 'auto';

export const ROUTING_MAP: Record<RoutingStrategy, string> = {
  cheapest:        'google/gemini-flash',
  fastest:         'google/gemini-flash',
  highest_quality: 'anthropic/claude-sonnet-4-5',
  balanced:        'google/gemini-pro',
  auto:            'google/gemini-pro',
};

export const MODEL_ALIAS_MAP: Record<string, string> = {
  'auto':           'google/gemini-pro',
  'gemini-pro':     'google/gemini-pro',
  'gemini-flash':   'google/gemini-flash',
  'gpt-4.1':        'openai/gpt-4.1',
  'gpt-4o-mini':    'openai/gpt-4o-mini',
  'claude-sonnet':  'anthropic/claude-sonnet-4-5',
  'mistral-large':  'mistralai/mistral-large',
  'deepseek':       'deepseek/deepseek-chat',
  'grok-3':         'x-ai/grok-3',
  'perplexity':     'perplexity/sonar-pro',
};
