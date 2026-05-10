import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();
const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const API_KEY = process.env.ETHERSCAN_API_KEY || '';

function etherscanUrl(params: Record<string, string>) {
  const query = new URLSearchParams({ ...params, apikey: API_KEY, chainid: '1' }).toString();
  return `${ETHERSCAN_BASE}?${query}`;
}

// ── GET /v1/balance/:address ──────────────────────────────────────────────────
router.get('/balance', async (req, res) => {
  const address = (req.query.address || req.body?.address || '') as string;
  if (!address) return res.status(400).json({ error: 'Provide address as query param or body field' });
  req.params = req.params || {};
  (req.params as any).address = address;
  req.url = `/balance/${address}`;
  (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});

router.get('/balance/:address', async (req: Request, res: Response) => {
  const schema = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  });
  const { error, value } = schema.validate({ address: req.params.address });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    console.log(`[balance] address=${value.address}`);
    const url = etherscanUrl({
      module: 'account',
      action: 'balance',
      address: value.address,
      tag: 'latest'
    });
    const { data } = await axios.get(url);
    if (data.status !== '1') {
      return res.status(400).json({ error: data.message || 'Etherscan error', result: data.result });
    }
    const wei = BigInt(data.result);
    const eth = Number(wei) / 1e18;
    return res.json({
      address: value.address,
      balance_wei: data.result,
      balance_eth: eth.toFixed(8),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[balance] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// ── GET /v1/tokens/:address ───────────────────────────────────────────────────
router.get('/tokens/:address', async (req: Request, res: Response) => {
  const addrSchema = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  });
  const querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    offset: Joi.number().integer().min(1).max(100).default(20)
  });

  const { error: addrErr, value: addrVal } = addrSchema.validate({ address: req.params.address });
  if (addrErr) return res.status(400).json({ error: addrErr.details[0].message });

  const { error: qErr, value: qVal } = querySchema.validate(req.query);
  if (qErr) return res.status(400).json({ error: qErr.details[0].message });

  try {
    console.log(`[tokens] address=${addrVal.address} page=${qVal.page} offset=${qVal.offset}`);
    const url = etherscanUrl({
      module: 'account',
      action: 'tokentx',
      address: addrVal.address,
      page: String(qVal.page),
      offset: String(qVal.offset),
      sort: 'desc'
    });
    const { data } = await axios.get(url);
    if (data.status !== '1') {
      // status=0 with "No transactions found" is valid empty
      if (data.message === 'No transactions found') {
        return res.json({ address: addrVal.address, tokens: [], count: 0, timestamp: new Date().toISOString() });
      }
      return res.status(400).json({ error: data.message || 'Etherscan error' });
    }

    // Deduplicate by token contract, sum isn't reliable from tx list — return unique tokens seen
    const seen = new Map<string, any>();
    for (const tx of data.result) {
      if (!seen.has(tx.contractAddress)) {
        seen.set(tx.contractAddress, {
          contract_address: tx.contractAddress,
          token_name: tx.tokenName,
          token_symbol: tx.tokenSymbol,
          token_decimal: tx.tokenDecimal,
          last_transfer: tx.timeStamp
        });
      }
    }

    return res.json({
      address: addrVal.address,
      tokens: Array.from(seen.values()),
      count: seen.size,
      page: qVal.page,
      offset: qVal.offset,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[tokens] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch token holdings' });
  }
});

// ── GET /v1/portfolio/:address ────────────────────────────────────────────────
router.get('/portfolio/:address', async (req: Request, res: Response) => {
  const schema = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  });
  const { error, value } = schema.validate({ address: req.params.address });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    console.log(`[portfolio] address=${value.address}`);

    // Fetch ETH balance + token list in parallel
    const [balRes, tokRes] = await Promise.all([
      axios.get(etherscanUrl({ module: 'account', action: 'balance', address: value.address, tag: 'latest' })),
      axios.get(etherscanUrl({ module: 'account', action: 'tokentx', address: value.address, page: '1', offset: '50', sort: 'desc' }))
    ]);

    const wei = BigInt(balRes.data.result || '0');
    const eth = Number(wei) / 1e18;

    const seen = new Map<string, any>();
    if (tokRes.data.status === '1') {
      for (const tx of tokRes.data.result) {
        if (!seen.has(tx.contractAddress)) {
          seen.set(tx.contractAddress, {
            contract_address: tx.contractAddress,
            token_name: tx.tokenName,
            token_symbol: tx.tokenSymbol,
            token_decimal: tx.tokenDecimal,
            last_transfer: new Date(Number(tx.timeStamp) * 1000).toISOString()
          });
        }
      }
    }

    return res.json({
      address: value.address,
      eth: {
        balance_wei: balRes.data.result,
        balance_eth: eth.toFixed(8)
      },
      erc20_tokens: Array.from(seen.values()),
      token_count: seen.size,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[portfolio] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// ── GET /v1/transactions/:address ─────────────────────────────────────────────
router.get('/transactions/:address', async (req: Request, res: Response) => {
  const addrSchema = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  });
  const querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    offset: Joi.number().integer().min(1).max(50).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc')
  });

  const { error: addrErr, value: addrVal } = addrSchema.validate({ address: req.params.address });
  if (addrErr) return res.status(400).json({ error: addrErr.details[0].message });

  const { error: qErr, value: qVal } = querySchema.validate(req.query);
  if (qErr) return res.status(400).json({ error: qErr.details[0].message });

  try {
    console.log(`[transactions] address=${addrVal.address}`);
    const url = etherscanUrl({
      module: 'account',
      action: 'txlist',
      address: addrVal.address,
      page: String(qVal.page),
      offset: String(qVal.offset),
      sort: qVal.sort
    });
    const { data } = await axios.get(url);
    if (data.status !== '1') {
      if (data.message === 'No transactions found') {
        return res.json({ address: addrVal.address, transactions: [], count: 0, timestamp: new Date().toISOString() });
      }
      return res.status(400).json({ error: data.message || 'Etherscan error' });
    }

    const transactions = data.result.map((tx: any) => ({
      hash: tx.hash,
      block_number: tx.blockNumber,
      timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
      from: tx.from,
      to: tx.to,
      value_eth: (Number(tx.value) / 1e18).toFixed(8),
      gas_used: tx.gasUsed,
      gas_price_gwei: (Number(tx.gasPrice) / 1e9).toFixed(2),
      status: tx.isError === '0' ? 'success' : 'failed',
      function_name: tx.functionName || null
    }));

    return res.json({
      address: addrVal.address,
      transactions,
      count: transactions.length,
      page: qVal.page,
      offset: qVal.offset,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[transactions] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
