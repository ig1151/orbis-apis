// All model slugs are verified OpenRouter IDs as of May 2025
// Update slugs here only — aliases stay stable across the codebase

export interface ModelConfig {
  alias:                string;
  provider:             'anthropic' | 'google' | 'openai' | 'xai' | 'deepseek' | 'mistralai' | 'perplexity';
  modelSlug:            string;       // exact OpenRouter model ID
  displayName:          string;
  maxInputTokens:       number;
  maxOutputTokens:      number;
  supportsJsonMode:     boolean;
  supportsToolCalling:  boolean;
  costTier:             'low' | 'medium' | 'high' | 'premium';
  defaultRoutingWeight: number;       // higher = preferred when multiple models tie
  enabled:              boolean;
}

export const MODELS: Record<string, ModelConfig> = {
  // ── Anthropic ──────────────────────────────────────────────────────────────
  'claude-opus': {
    alias: 'claude-opus',
    provider: 'anthropic',
    modelSlug: 'anthropic/claude-opus-4.7',
    displayName: 'Claude Opus 4.7',
    maxInputTokens: 200000,
    maxOutputTokens: 32000,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'premium',
    defaultRoutingWeight: 90,
    enabled: true,
  },
  'claude-sonnet': {
    alias: 'claude-sonnet',
    provider: 'anthropic',
    modelSlug: 'anthropic/claude-4.5-sonnet-20250929',
    displayName: 'Claude Sonnet 4.5',
    maxInputTokens: 200000,
    maxOutputTokens: 16000,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'high',
    defaultRoutingWeight: 80,
    enabled: true,
  },

  // ── Google ─────────────────────────────────────────────────────────────────
  'gemini-pro': {
    alias: 'gemini-pro',
    provider: 'google',
    modelSlug: 'google/gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'high',
    defaultRoutingWeight: 85,
    enabled: true,
  },
  'gemini-flash': {
    alias: 'gemini-flash',
    provider: 'google',
    modelSlug: 'google/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'low',
    defaultRoutingWeight: 75,
    enabled: true,
  },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  'gpt-premium': {
    alias: 'gpt-premium',
    provider: 'openai',
    modelSlug: 'openai/gpt-4.1',
    displayName: 'GPT-4.1',
    maxInputTokens: 1000000,
    maxOutputTokens: 32768,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'high',
    defaultRoutingWeight: 82,
    enabled: true,
  },
  'gpt-mini': {
    alias: 'gpt-mini',
    provider: 'openai',
    modelSlug: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'low',
    defaultRoutingWeight: 70,
    enabled: true,
  },

  // ── xAI ───────────────────────────────────────────────────────────────────
  'grok-premium': {
    alias: 'grok-premium',
    provider: 'xai',
    modelSlug: 'x-ai/grok-4.1-fast',
    displayName: 'Grok 4.1 Fast',
    maxInputTokens: 2000000,
    maxOutputTokens: 32768,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'premium',
    defaultRoutingWeight: 88,
    enabled: true,
  },

  // ── DeepSeek ───────────────────────────────────────────────────────────────
  'deepseek': {
    alias: 'deepseek',
    provider: 'deepseek',
    modelSlug: 'deepseek/deepseek-chat',
    displayName: 'DeepSeek Chat',
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'low',
    defaultRoutingWeight: 65,
    enabled: true,
  },

  // ── Mistral ────────────────────────────────────────────────────────────────
  'mistral-large': {
    alias: 'mistral-large',
    provider: 'mistralai',
    modelSlug: 'mistralai/mistral-large',
    displayName: 'Mistral Large',
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    supportsJsonMode: true,
    supportsToolCalling: true,
    costTier: 'medium',
    defaultRoutingWeight: 68,
    enabled: true,
  },
};

// ── Routing strategy → alias resolution ────────────────────────────────────
export function resolveAlias(modelOrStrategy: string): ModelConfig {
  switch (modelOrStrategy) {
    case 'cheapest':
      return pickBy('costTier', ['low'], 'defaultRoutingWeight');
    case 'fastest':
      return MODELS['gemini-flash'];
    case 'highest_quality':
      return pickBy('costTier', ['premium', 'high'], 'defaultRoutingWeight');
    case 'balanced':
    case 'auto':
      return MODELS['gemini-flash'];
    default:
      return MODELS[modelOrStrategy] ?? MODELS['gemini-flash'];
  }
}

function pickBy(
  field: keyof ModelConfig,
  values: string[],
  sortBy: keyof ModelConfig
): ModelConfig {
  const candidates = Object.values(MODELS)
    .filter(m => m.enabled && values.includes(m[field] as string))
    .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
  return candidates[0] ?? MODELS['gemini-flash'];
}
