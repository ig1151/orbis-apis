import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftInfluencerTrackingRouter = Router();

// GET /nft-influencer-tracking/activity?limit=20
nftInfluencerTrackingRouter.get('/activity', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 15, 50);
  const timeframe = (req.query.timeframe as string) || '24h';
  const collection = (req.query.collection as string) || '';

  const prompt = `NFT influencer activity in ${timeframe}${collection ? ` for ${collection}` : ''}. Return 3 activities as compact JSON:
{"timeframe":"${timeframe}","generated_at":"ISO timestamp","influencer_activity":[{"influencer":{"handle":"@string","name":"string","followers":number,"nft_influence_score":number,"tier":"mega|macro|mid"},"activity_type":"purchase|shill_tweet|list_for_sale","collection":"string","price_eth":number,"tweet_text":"brief summary","timestamp":"ISO timestamp","market_impact":{"floor_change_pct":number,"volume_spike_pct":number},"signal_type":"bullish|bearish|neutral","copycat_risk":"high|medium|low"},{"influencer":{"handle":"@string","name":"string","followers":number,"nft_influence_score":number,"tier":"macro|mid"},"activity_type":"purchase|shill_tweet","collection":"string","price_eth":number,"tweet_text":"brief summary","timestamp":"ISO timestamp","market_impact":{"floor_change_pct":number,"volume_spike_pct":number},"signal_type":"bullish|neutral","copycat_risk":"medium|low"},{"influencer":{"handle":"@string","name":"string","followers":number,"nft_influence_score":number,"tier":"macro|mid"},"activity_type":"shill_tweet|purchase","collection":"string","price_eth":number,"tweet_text":"brief summary","timestamp":"ISO timestamp","market_impact":{"floor_change_pct":number,"volume_spike_pct":number},"signal_type":"bullish|bearish","copycat_risk":"high|medium|low"}],"trending_collections_by_influencers":[{"collection":"string","mention_count":number,"sentiment":"bullish|bearish|mixed","momentum":"accelerating|stable|fading"},{"collection":"string","mention_count":number,"sentiment":"bullish|mixed","momentum":"accelerating|stable"}],"top_influencers_by_accuracy":[{"handle":"string",
      "win_rate_pct": number,
      "avg_return_after_shill_pct": number,
      "total_shills_30d": number
    }
  ],
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

// GET /nft-influencer-tracking/influencer/:handle
nftInfluencerTrackingRouter.get('/influencer/:handle', async (req: Request, res: Response) => {
  const { handle } = req.params;

  const prompt = `Profile NFT influencer: ${handle}
Return JSON:
{
  "handle": "${handle}",
  "profile": {
    "name": "string",
    "followers": number,
    "influence_score": number,
    "tier": "mega" | "macro" | "mid" | "micro",
    "specialty": ["BAYC", "gaming NFTs", "art", etc.],
    "track_record": {
      "total_calls_90d": number,
      "profitable_calls_pct": number,
      "avg_roi_after_shill_pct": number,
      "avg_rug_rate_pct": number,
      "reputation": "trustworthy" | "mixed" | "questionable" | "rug_history"
    }
  },
  "recent_holdings": [
    { "collection": "string", "token_id": "string", "acquired_eth": number, "current_value_eth": number, "pnl_eth": number }
  ],
  "recent_shills": [
    { "collection": "string", "date": "ISO date", "outcome": "pumped" | "stable" | "dumped", "roi_pct": number }
  ],
  "risk_assessment": "string",
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

nftInfluencerTrackingRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Influencer Tracking',
    version: '1.0.0',
    description: 'Track which NFTs influencers are buying and shilling',
    endpoints: [
      { path: '/activity', method: 'GET', params: ['limit', 'timeframe', 'collection'] },
      { path: '/influencer/:handle', method: 'GET', params: [] }
    ]
  });
});

nftInfluencerTrackingRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-influencer-tracking',
    version: '1.1.0',
    description: 'Track NFT influencer buying and shilling activity with win rate history',
    x402_supported: true,
    x_latency_tier: 'near-real-time',
    pricing: { tier: 'platform', unit_cost_usd: 0.012 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/activity', method: 'GET', billable: true, params: ['limit', 'timeframe', 'collection'] },
      { path: '/influencer/:handle', method: 'GET', billable: true },
      { path: '/lookup', method: 'GET', billable: true, params: ['collection'], description: 'One-call influencer sentiment for a collection' }
    ],
    chain_to: [
      { api: 'nft-whale-tracker', reason: 'check if influencer is also a tracked whale' },
      { api: 'nft-mint-calendar', reason: 'correlate influencer shills with upcoming mints' },
      { api: 'nft-volume-heatmap', reason: 'see if influencer activity caused volume spikes' }
    ],
    execution_notes: 'Influencer signals carry pump-and-dump risk. Always check copycat_risk score before following.'
  });
});

nftInfluencerTrackingRouter.get('/lookup', async (req: Request, res: Response) => {
  const collection = (req.query.collection as string) || '';
  if (!collection) return res.status(400).json({ success: false, error: 'collection is required' });

  const prompt = `You are an NFT influencer intelligence system. One-call full influencer sentiment analysis for collection: "${collection}".

Return ONLY JSON:
{
  "collection": "${collection}",
  "analyzed_at": "ISO timestamp",
  "influencer_sentiment": {
    "overall": "bullish|bearish|mixed|neutral",
    "score": number (0-100, 50=neutral),
    "momentum": "accelerating|stable|fading",
    "unique_influencers_active_7d": number,
    "total_mentions_7d": number
  },
  "top_bulls": [
    {
      "handle": "@string",
      "tier": "mega|macro|mid|micro",
      "followers": number,
      "win_rate_pct": number,
      "recent_action": "bought|shilled|accumulated",
      "conviction_level": "high|medium|low",
      "copycat_risk": "high|medium|low"
    }
  ],
  "top_bears": [
    { "handle": "@string", "tier": "string", "reason": "string" }
  ],
  "shill_quality": {
    "avg_influencer_win_rate_pct": number,
    "organic_vs_paid_ratio": "mostly_organic|mixed|mostly_paid|unknown",
    "coordinated_shill_detected": boolean,
    "pump_dump_risk": "high|medium|low"
  },
  "market_impact_history": [
    { "event": "string", "influencer": "@string", "floor_change_pct": number, "date": "ISO date" }
  ],
  "reasoning": {
    "why_sentiment_is_this": "string",
    "risk_factors": ["string array"],
    "invalidators": ["conditions that would flip sentiment"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "sentiment": number,
    "shill_quality": number,
    "top_bulls": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-whale-tracker", "reason": "verify if influencer buys are backed by whale accumulation", "params": { "collection": "${collection}" } },
    { "api": "nft-volume-heatmap", "reason": "confirm volume spike correlates with influencer activity" }
  ],
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 600,
    "latency_tier": "near-real-time"
  }
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
