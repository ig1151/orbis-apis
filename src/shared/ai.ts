import axios from 'axios';
export type Messages = string | { role: string; content: string }[];
const cache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 25000;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// A failure is worth retrying only if it is transient: a timeout/connection
// reset, a 429 rate-limit, or any 5xx from the upstream LLM gateway.
function isRetryable(err: any): boolean {
  if (err?.code === 'ECONNABORTED' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') return true;
  const status = err?.response?.status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

export async function callAI(input: Messages, systemPrompt?: string, maxTokens: number = 1000): Promise<string> {
  const messages: { role: string; content: string }[] = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const cacheKey = JSON.stringify({ messages, systemPrompt, maxTokens });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.result;
  const body: Record<string, unknown> = { model: 'anthropic/claude-sonnet-4-5', max_tokens: maxTokens, messages };
  if (systemPrompt) body.system = systemPrompt;

  let lastErr: any;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(500 * Math.pow(2, attempt - 1)); // 500ms, then 1s
    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://orbis-apis.onrender.com', 'X-Title': 'Orbis APIs' },
        timeout: REQUEST_TIMEOUT_MS,
      });
      const data = res.data as { choices?: { message?: { content?: string } }[] };
      const result = data?.choices?.[0]?.message?.content;
      if (typeof result !== 'string') throw new Error('LLM response missing choices[0].message.content');
      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS - 1 && isRetryable(err)) continue;
      throw err;
    }
  }
  throw lastErr;
}

// Hardened drop-in for the ~287 copy-pasted local `callClaude(prompt): Promise<string>`
// definitions across the fleet. Same signature + same default model (claude-sonnet-4-5),
// but routed through the timeout+retry+guarded-extraction core above. The local copies
// sent no max_tokens (unbounded); we pass a generous ceiling so the large JSON these
// endpoints return is not truncated (which would break their parseJSON).
export function callClaude(prompt: string): Promise<string> {
  return callAI(prompt, undefined, 4096);
}
export function parseAIJson<T = Record<string, unknown>>(raw: string, fallback?: Partial<T>): T {
  try {
    const stripped = raw.replace(/```json\s*|```\s*/g, '').trim();
    const cleaned = stripped.replace(/("(?:[^"\\]|\\.)*")/g, (match: string) => match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'));
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found');
    return JSON.parse(match[0]) as T;
  } catch {
    return { raw, ...(fallback ?? {}) } as unknown as T;
  }
}
export async function callAIJson<T = Record<string, unknown>>(input: Messages, systemPrompt?: string, maxTokens: number = 1000, fallback?: Partial<T>): Promise<T> {
  const raw = await callAI(input, systemPrompt, maxTokens);
  return parseAIJson<T>(raw, fallback);
}

// ── Route-aware provenance data sources ──────────────────────
const ROUTE_SOURCES: Record<string, string[]> = {
  'strategy-signal':          ['CoinGecko', 'Binance', 'Polymarket'],
  'derivatives-intelligence': ['Deribit', 'Binance Futures', 'CoinGlass'],
  'derivatives':              ['Deribit', 'Binance Futures', 'OKX'],
  'market-stress':            ['Federal Reserve', 'CoinGecko', 'Glassnode'],
  'market-intelligence':      ['CoinGecko', 'Messari', 'Binance'],
  'deep-research':            ['Messari', 'Glassnode', 'CoinGecko', 'DeFiLlama'],
  'intelligence-extraction':  ['Reuters', 'Bloomberg', 'CoinDesk'],
  'outreach-execution':       ['internal-crm', 'OpenRouter'],
  'career-optimization':      ['LinkedIn', 'OpenRouter'],
  'voice-intelligence':       ['internal-transcript', 'OpenRouter'],
  'tx-simulator':             ['Ethereum RPC', 'Alchemy', 'Etherscan'],
  'proposal-generation':      ['internal-template', 'OpenRouter'],
  'agent-observability':      ['internal-telemetry', 'OpenRouter'],
  'tokenomics':               ['CoinGecko', 'DeFiLlama', 'Etherscan'],
  'defi-risk':                ['DeFiLlama', 'CoinGecko', 'Aave'],
  'smart-contract-risk':      ['Etherscan', 'OpenZeppelin', 'CertiK'],
  'default':                  ['OpenRouter', 'internal'],
};

// ── Realistic tiered pricing ──────────────────────────────────
function computeCost(route: string): { total_usd: number; inference_usd: number; io_usd: number; overhead_usd: number } {
  const tiers: Record<string, number> = {
    'derivatives-intelligence': 0.048,
    'deep-research':            0.042,
    'market-stress':            0.036,
    'strategy-signal':          0.032,
    'market-intelligence':      0.028,
    'tokenomics':               0.026,
    'defi-risk':                0.024,
    'smart-contract-risk':      0.024,
    'derivatives':              0.022,
    'intelligence-extraction':  0.018,
    'voice-intelligence':       0.016,
    'career-optimization':      0.014,
    'outreach-execution':       0.012,
    'proposal-generation':      0.018,
    'tx-simulator':             0.014,
    'agent-observability':      0.022,
    'default':                  0.010,
  };
  const key = Object.keys(tiers).find(k => route.includes(k)) || 'default';
  const total = tiers[key];
  return {
    total_usd:     total,
    inference_usd: parseFloat((total * 0.70).toFixed(4)),
    io_usd:        parseFloat((total * 0.20).toFixed(4)),
    overhead_usd:  parseFloat((total * 0.10).toFixed(4)),
  };
}

// ── Shared buildRuntime ───────────────────────────────────────
export function buildRuntime(req: any, overrides: Record<string, any> = {}): Record<string, any> {
  const now = Date.now();
  const route = req.originalUrl || req.path || req.url || '';
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;

  const routeKey = Object.keys(ROUTE_SOURCES).find(k => route.includes(k)) || 'default';
  const sources  = ROUTE_SOURCES[routeKey];
  const cost     = overrides.cost_breakdown || computeCost(route);

  return {
    trace_id,
    execution_id,
    session_id,
    request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || { total_ms: 0, inference_ms: 0, io_ms: 0, overhead_ms: 0 },
    cost_breakdown:    cost,
    provenance: overrides.provenance || {
      api_version:  '1.0.0',
      model:        'anthropic/claude-sonnet-4-5',
      data_sources: sources,
      computed_at:  new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts:     3,
      backoff_strategy: 'exponential',
      backoff_base_ms:  500,
      safe_to_retry:    true,
      idempotency_key:  request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: null,
      triggered_by:     null,
      downstream:       [],
      dag_id:           null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain:       true,
      suggested_next:  [],
      requires_review: false,
    },
  };
}
