import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

export const router = Router();

const LIFI_API = 'https://li.quest/v1';
const FROM_ADDRESS = '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0';

const CHAIN_MAP: Record<string, number> = {
  ethereum: 1, eth: 1,
  arbitrum: 42161, arb: 42161,
  polygon: 137, matic: 137,
  optimism: 10, op: 10,
  base: 8453,
  avalanche: 43114, avax: 43114,
  bsc: 56, bnb: 56,
  gnosis: 100,
  zksync: 324,
  linea: 59144,
  scroll: 534352,
};

function resolveChain(name: string): number | null {
  return CHAIN_MAP[name.toLowerCase()] || null;
}

function toWei(amount: string, decimals: number = 6): string {
  return Math.floor(parseFloat(amount) * 10 ** decimals).toString();
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cross-chain-bridge-api', timestamp: new Date().toISOString() });
});

router.get('/bridge/chains', async (_req, res) => {
  try {
    const r = await axios.get(`${LIFI_API}/chains`, { timeout: 10000 });
    const chains = r.data.chains.map((c: any) => ({
      id: c.id, name: c.name, key: c.key,
      nativeToken: c.nativeToken?.symbol,
    }));
    res.json({ count: chains.length, chains });
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch chains', detail: err.message });
  }
});

router.get('/bridge/tokens', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({ chain: Joi.string().required() }).validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const chainId = resolveChain(value.chain);
  if (!chainId) return res.status(400).json({ error: `Unknown chain: ${value.chain}` });
  try {
    const r = await axios.get(`${LIFI_API}/tokens`, { params: { chains: chainId }, timeout: 10000 });
    const tokens = (r.data.tokens[chainId] || []).slice(0, 100).map((t: any) => ({
      symbol: t.symbol, name: t.name, address: t.address, decimals: t.decimals,
    }));
    res.json({ chain: value.chain, chainId, count: tokens.length, tokens });
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch tokens', detail: err.message });
  }
});

async function getQuote(value: any) {
  const fromChainId = resolveChain(value.fromChain);
  const toChainId = resolveChain(value.toChain);
  if (!fromChainId) throw new Error(`Unknown fromChain: ${value.fromChain}`);
  if (!toChainId) throw new Error(`Unknown toChain: ${value.toChain}`);

  const [fromTokensRes, toTokensRes] = await Promise.all([
    axios.get(`${LIFI_API}/tokens`, { params: { chains: fromChainId }, timeout: 10000 }),
    axios.get(`${LIFI_API}/tokens`, { params: { chains: toChainId }, timeout: 10000 }),
  ]);
  const fromTokens: any[] = fromTokensRes.data.tokens[fromChainId] || [];
  const toTokens: any[] = toTokensRes.data.tokens[toChainId] || [];
  const fromToken = fromTokens.find((t: any) => t.symbol.toUpperCase() === value.fromToken.toUpperCase());
  const toToken = toTokens.find((t: any) => t.symbol.toUpperCase() === value.toToken.toUpperCase());
  if (!fromToken) throw new Error(`Token ${value.fromToken} not found on ${value.fromChain}`);
  if (!toToken) throw new Error(`Token ${value.toToken} not found on ${value.toChain}`);

  const fromAmount = toWei(value.amount, fromToken.decimals);
  const r = await axios.get(`${LIFI_API}/quote`, {
    params: {
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: fromToken.address,
      toToken: toToken.address,
      fromAmount,
      fromAddress: FROM_ADDRESS,
    },
    timeout: 15000,
  });

  return { quote: r.data, fromToken, toToken };
}

function formatQuote(quote: any, fromToken: any, toToken: any) {
  const est = quote.estimate;
  const outputAmount = parseFloat(est.toAmount) / 10 ** (toToken.decimals || 6);
  const totalFeesUSD = est.feeCosts?.reduce((s: number, f: any) => s + parseFloat(f.amountUSD || 0), 0) || 0;
  const gasUSD = est.gasCosts?.reduce((s: number, g: any) => s + parseFloat(g.amountUSD || 0), 0) || 0;
  return {
    bridge: quote.toolDetails?.name || quote.tool,
    fromToken: fromToken.symbol,
    toToken: toToken.symbol,
    estimatedOutput: outputAmount.toFixed(6),
    totalFeesUSD: Math.round((totalFeesUSD + gasUSD) * 100) / 100,
    bridgeFeesUSD: Math.round(totalFeesUSD * 100) / 100,
    gasFeesUSD: Math.round(gasUSD * 100) / 100,
    estimatedTimeSeconds: est.executionDuration,
    fromAmountUSD: est.fromAmountUSD,
    toAmountUSD: est.toAmountUSD,
  };
}

router.get('/bridge/best', async (req: Request, res: Response) => {
  const schema = Joi.object({
    fromChain: Joi.string().required(),
    toChain: Joi.string().required(),
    fromToken: Joi.string().required(),
    toToken: Joi.string().required(),
    amount: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    res.json({
      timestamp: new Date().toISOString(),
      fromChain: value.fromChain,
      toChain: value.toChain,
      amount: value.amount,
      bestRoute: formatQuote(quote, fromToken, toToken),
    });
  } catch (err: any) {
    console.error('[best]', err.message);
    res.status(502).json({ error: err.message });
  }
});

router.get('/bridge/routes', async (req: Request, res: Response) => {
  const schema = Joi.object({
    fromChain: Joi.string().required(),
    toChain: Joi.string().required(),
    fromToken: Joi.string().required(),
    toToken: Joi.string().required(),
    amount: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    res.json({
      timestamp: new Date().toISOString(),
      fromChain: value.fromChain,
      toChain: value.toChain,
      amount: value.amount,
      count: 1,
      routes: [formatQuote(quote, fromToken, toToken)],
    });
  } catch (err: any) {
    console.error('[routes]', err.message);
    res.status(502).json({ error: err.message });
  }
});


// ── v2 Agent Endpoints ─────────────────────────────────────────────────────

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

function meta(startMs: number, cost: number) {
  return { latency_ms: Date.now() - startMs, estimated_cost: cost };
}

async function callAI(prompt: string): Promise<any> {
  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  const raw = res.data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// POST /compare-routes
router.post('/compare-routes', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    fromChain: Joi.string().required(), toChain: Joi.string().required(),
    fromToken: Joi.string().required(), toToken: Joi.string().required(),
    amount: Joi.string().required(),
    priority: Joi.string().valid('cheapest', 'fastest', 'safest').default('cheapest')
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    const route = formatQuote(quote, fromToken, toToken);
    const ai = await callAI(`Score this bridge route. Return ONLY valid JSON, no markdown.
Route: ${JSON.stringify(route)} | Priority: ${value.priority} | Amount: ${value.amount}
All scores must be decimals 0.0-1.0:
{"recommended":true,"score":0.0,"priority_match":true,"risk_level":"low|medium|high","value_score":0.0,"speed_score":0.0,"safety_score":0.0,"recommendation":"use|consider|avoid","reason":"one sentence"}`);
    return res.json({ ...route, ...ai, fromChain: value.fromChain, toChain: value.toChain, amount: value.amount, timestamp: new Date().toISOString(), metadata: meta(start, 0.003) });
  } catch (err: any) { return res.status(502).json({ error: err.message }); }
});

// POST /score-route
router.post('/score-route', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    fromChain: Joi.string().required(), toChain: Joi.string().required(),
    fromToken: Joi.string().required(), toToken: Joi.string().required(),
    amount: Joi.string().required()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    const route = formatQuote(quote, fromToken, toToken);
    const ai = await callAI(`Score this bridge route across dimensions. Return ONLY valid JSON, no markdown.
Route: ${JSON.stringify(route)} | Amount: ${value.amount} | From: ${value.fromChain} | To: ${value.toChain}
All scores must be decimals 0.0-1.0:
{"overall_score":0.0,"fee_score":0.0,"speed_score":0.0,"safety_score":0.0,"liquidity_score":0.0,"grade":"A|B|C|D|F","safe_to_use":true,"confidence":0.0,"summary":"one sentence"}`);
    return res.json({ ...route, ...ai, fromChain: value.fromChain, toChain: value.toChain, amount: value.amount, timestamp: new Date().toISOString(), metadata: meta(start, 0.0025) });
  } catch (err: any) { return res.status(502).json({ error: err.message }); }
});

// POST /estimate-slippage
router.post('/estimate-slippage', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    fromChain: Joi.string().required(), toChain: Joi.string().required(),
    fromToken: Joi.string().required(), toToken: Joi.string().required(),
    amount: Joi.string().required()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    const route = formatQuote(quote, fromToken, toToken);
    const inputUSD = parseFloat(route.fromAmountUSD || '0');
    const outputUSD = parseFloat(route.toAmountUSD || '0');
    const slippagePct = inputUSD > 0 ? ((inputUSD - outputUSD) / inputUSD) * 100 : 0;
    return res.json({
      fromChain: value.fromChain, toChain: value.toChain,
      fromToken: value.fromToken, toToken: value.toToken, amount: value.amount,
      estimated_slippage_pct: parseFloat(slippagePct.toFixed(4)),
      input_usd: inputUSD, output_usd: outputUSD,
      total_cost_usd: route.totalFeesUSD, bridge: route.bridge,
      slippage_level: slippagePct < 0.1 ? 'minimal' : slippagePct < 0.5 ? 'low' : slippagePct < 2 ? 'medium' : 'high',
      safe_to_proceed: slippagePct < 2,
      timestamp: new Date().toISOString(), metadata: meta(start, 0.002)
    });
  } catch (err: any) { return res.status(502).json({ error: err.message }); }
});

// POST /monitor-bridge
router.post('/monitor-bridge', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    fromChain: Joi.string().required(), toChain: Joi.string().required(),
    fromToken: Joi.string().required(), toToken: Joi.string().required(),
    amount: Joi.string().required()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    const route = formatQuote(quote, fromToken, toToken);
    const ai = await callAI(`Assess current bridge conditions. Return ONLY valid JSON, no markdown.
Route: ${JSON.stringify(route)} | From: ${value.fromChain} | To: ${value.toChain}
{"status":"optimal|degraded|congested|unavailable","alert_level":"none|watch|alert|critical","conditions":[{"type":"fees|speed|liquidity|congestion","description":"one sentence","severity":"low|medium|high"}],"recommended_action":"proceed|wait|use_alternative","next_check_ms":300000,"confidence":0.0}`);
    return res.json({ ...ai, bridge: route.bridge, fromChain: value.fromChain, toChain: value.toChain, current_fees_usd: route.totalFeesUSD, estimated_time_seconds: route.estimatedTimeSeconds, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) { return res.status(502).json({ error: err.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    fromChain: Joi.string().required(), toChain: Joi.string().required(),
    fromToken: Joi.string().required(), toToken: Joi.string().required(),
    amount: Joi.string().required(),
    max_fees_usd: Joi.number().optional(),
    max_slippage_pct: Joi.number().optional(),
    source: Joi.string().default('agent'),
    signal_confidence: Joi.number().min(0).max(1).default(0.5)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const { quote, fromToken, toToken } = await getQuote(value);
    const route = formatQuote(quote, fromToken, toToken);
    const inputUSD = parseFloat(route.fromAmountUSD || '0');
    const outputUSD = parseFloat(route.toAmountUSD || '0');
    const slippagePct = inputUSD > 0 ? ((inputUSD - outputUSD) / inputUSD) * 100 : 0;
    const blocking_flags: string[] = [];
    if (value.max_fees_usd && route.totalFeesUSD > value.max_fees_usd) blocking_flags.push(`fees_too_high: $${route.totalFeesUSD} > $${value.max_fees_usd}`);
    if (value.max_slippage_pct && slippagePct > value.max_slippage_pct) blocking_flags.push(`slippage_too_high: ${slippagePct.toFixed(3)}% > ${value.max_slippage_pct}%`);
    const execute = blocking_flags.length === 0;
    return res.json({
      execute, bridge: route.bridge,
      estimated_output: route.estimatedOutput,
      total_fees_usd: route.totalFeesUSD,
      estimated_slippage_pct: parseFloat(slippagePct.toFixed(4)),
      estimated_time_seconds: route.estimatedTimeSeconds,
      blocking_flags,
      recommended_action: execute ? 'proceed' : 'block',
      recommended_next_api: execute ? 'autopilot' : null,
      recommended_next_endpoint: execute ? '/should-execute' : null,
      chain_context: { source_api: value.source, signal_confidence: value.signal_confidence, fromChain: value.fromChain, toChain: value.toChain, amount: value.amount },
      timestamp: new Date().toISOString(), metadata: meta(start, 0.0045)
    });
  } catch (err: any) { return res.status(502).json({ error: err.message }); }
});
