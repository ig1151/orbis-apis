import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftWhaleTrackerRouter = Router();

// GET /nft-whale-tracker/movements?collection=boredapeyachtclub&limit=20
nftWhaleTrackerRouter.get('/movements', async (req: Request, res: Response) => {
  const collection = (req.query.collection as string) || '';
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const chain = (req.query.chain as string) || 'ethereum';

  const prompt = `NFT whale movements for "${collection || 'blue-chip'}" on ${chain}. Return exactly 3 movements as compact JSON:
{"collection":"${collection || 'mixed'}","chain":"${chain}","generated_at":"ISO timestamp","whale_movements":[{"tx_hash":"0x...","event_type":"buy|sell|transfer","wallet_label":"string","wallet_rank":"top_10|top_50|top_100","collection_name":"string","token_id":"string","price_eth":number,"floor_price_eth":number,"signal_strength":"high|medium|low","signal_reason":"string"},{"tx_hash":"0x...","event_type":"buy|sell|transfer","wallet_label":"string","wallet_rank":"top_10|top_50|top_100","collection_name":"string","token_id":"string","price_eth":number,"floor_price_eth":number,"signal_strength":"high|medium|low","signal_reason":"string"},{"tx_hash":"0x...","event_type":"buy|sell","wallet_label":"string","wallet_rank":"top_50|top_100","collection_name":"string","token_id":"string","price_eth":number,"floor_price_eth":number,"signal_strength":"high|medium|low","signal_reason":"string"}],"summary":{"net_whale_sentiment":"accumulating|distributing|neutral","bullish_signals":number,"bearish_signals":number},"confidence":0.82,"data_freshness":"simulated"}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({
      success: true,
      data,
      meta: { runtime: buildRuntime(req), model: 'claude-sonnet', endpoint: 'nft-whale-tracker/movements' }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /nft-whale-tracker/wallet/:address
nftWhaleTrackerRouter.get('/wallet/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const chain = (req.query.chain as string) || 'ethereum';

  const prompt = `You are an NFT whale intelligence system. Profile this wallet address: ${address} on chain: ${chain}.

Return a JSON object:
{
  "wallet_address": "${address}",
  "chain": "${chain}",
  "profile": {
    "label": "known label or 'Unknown Whale'",
    "tier": "mega_whale" | "whale" | "dolphin" | "fish",
    "estimated_nft_portfolio_usd": number,
    "collections_held": number,
    "total_nfts_held": number,
    "blue_chip_count": number,
    "realized_profit_eth": number,
    "unrealized_profit_eth": number,
    "win_rate_pct": number,
    "avg_hold_days": number,
    "preferred_collections": ["array of collection names"],
    "trading_style": "flipper" | "holder" | "accumulator" | "diversified",
    "last_active": "ISO timestamp"
  },
  "recent_activity": [
    {
      "event_type": "buy" | "sell",
      "collection": "string",
      "token_id": "string",
      "price_eth": number,
      "timestamp": "ISO timestamp"
    }
  ],
  "risk_flags": ["array of risk flags if any"],
  "confidence": 0.0-1.0
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /nft-whale-tracker/info
nftWhaleTrackerRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Whale Tracker',
    version: '1.0.0',
    description: 'Track large NFT wallet movements across blue-chip collections',
    endpoints: [
      { path: '/movements', method: 'GET', params: ['collection', 'limit', 'chain'] },
      { path: '/wallet/:address', method: 'GET', params: ['chain'] }
    ]
  });
});

// GET / — discovery endpoint
nftWhaleTrackerRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-whale-tracker',
    version: '1.1.0',
    description: 'Track large NFT wallet movements across blue-chip collections',
    x402_supported: true,
    x_latency_tier: 'near-real-time',
    pricing: { tier: 'platform', unit_cost_usd: 0.012 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/movements', method: 'GET', billable: true, params: ['collection', 'limit', 'chain'] },
      { path: '/wallet/:address', method: 'GET', billable: true, params: ['chain'] },
      { path: '/lookup', method: 'GET', billable: true, params: ['address', 'chain'], description: 'One-call whale intelligence' }
    ],
    chain_to: [
      { api: 'nft-rarity-score', reason: 'score tokens being accumulated by whale' },
      { api: 'nft-volume-heatmap', reason: 'correlate whale activity with volume spikes' },
      { api: 'nft-influencer-tracking', reason: 'check if whale is also an influencer' }
    ],
    execution_notes: 'Whale signals are directional indicators, not trade instructions. Always verify on-chain.'
  });
});

// GET /lookup?address=0x...&chain=ethereum — one-call whale intelligence
nftWhaleTrackerRouter.get('/lookup', async (req: Request, res: Response) => {
  const address = (req.query.address as string) || '';
  const chain = (req.query.chain as string) || 'ethereum';
  if (!address) return res.status(400).json({ success: false, error: 'address is required' });

  const prompt = `You are an elite NFT whale intelligence system. Perform a complete one-call analysis for wallet: ${address} on ${chain}.

Return ONLY a JSON object:
{
  "wallet_address": "${address}",
  "chain": "${chain}",
  "analyzed_at": "ISO timestamp",
  "profile": {
    "label": "known label or 'Unknown Whale'",
    "tier": "mega_whale|whale|dolphin|fish",
    "estimated_portfolio_usd": number,
    "blue_chip_holdings": number,
    "total_nfts": number,
    "conviction_score": number (0-100, how committed this whale is to current positions),
    "followability_score": number (0-100, how worth copying this wallet's moves is),
    "trading_style": "flipper|holder|accumulator|diversified"
  },
  "recent_activity": [
    { "event": "buy|sell|transfer", "collection": "string", "token_id": "string", "price_eth": number, "timestamp": "ISO" }
  ],
  "sentiment": {
    "current": "accumulating|distributing|neutral",
    "momentum": "accelerating|stable|fading",
    "net_eth_flow_30d": number
  },
  "risk": {
    "rug_history": boolean,
    "wash_trading_flag": boolean,
    "concentration_risk": "high|medium|low",
    "risk_score": number (0-100),
    "risk_notes": "string"
  },
  "reasoning": {
    "why_whale_matters": "string",
    "key_signals": ["array of key behavioral signals"],
    "risk_factors": ["array of risk factors"],
    "invalidators": ["conditions that would change this assessment"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "profile": number,
    "sentiment": number,
    "risk": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-rarity-score", "reason": "score the tokens this whale is accumulating", "params": { "collection": "inferred from holdings" } },
    { "api": "nft-volume-heatmap", "reason": "time your entry around this whale's activity patterns" }
  ],
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 300,
    "latency_tier": "near-real-time"
  }
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req), endpoint: 'nft-whale-tracker/lookup' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
