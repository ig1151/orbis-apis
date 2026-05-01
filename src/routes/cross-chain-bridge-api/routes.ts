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
