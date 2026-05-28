import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftVolumeHeatmapRouter = Router();

// GET /nft-volume-heatmap/collection?name=boredapeyachtclub&period=30d
nftVolumeHeatmapRouter.get('/collection', async (req: Request, res: Response) => {
  const collection = (req.query.name as string) || '';
  const period = (req.query.period as string) || '30d';
  const granularity = (req.query.granularity as string) || 'daily'; // hourly | daily

  if (!collection) return res.status(400).json({ success: false, error: 'name (collection) is required' });

  const prompt = `You are an NFT volume analytics engine. Generate volume heatmap data for "${collection}" over ${period} with ${granularity} granularity.

Return JSON:
{
  "collection": "${collection}",
  "period": "${period}",
  "granularity": "${granularity}",
  "chain": "ethereum",
  "floor_price_eth": number,
  "heatmap_data": [
    {
      "timestamp": "ISO timestamp",
      "date_label": "human label (e.g. 'Mon Jun 3' or 'Jun 3 14:00')",
      "volume_eth": number,
      "volume_usd": number,
      "sales_count": number,
      "avg_price_eth": number,
      "floor_price_eth": number,
      "unique_buyers": number,
      "unique_sellers": number,
      "intensity": 0.0-1.0 (relative to peak volume in period),
      "intensity_label": "dead" | "slow" | "moderate" | "active" | "hot" | "peak"
    }
  ],
  "peak_windows": [
    {
      "timestamp": "ISO timestamp",
      "reason": "explanation of why volume spiked",
      "volume_eth": number,
      "multiplier_vs_avg": number
    }
  ],
  "best_entry_windows": [
    {
      "day_of_week": "Monday-Sunday",
      "hour_utc": number (0-23),
      "reason": "why this is a good entry time",
      "avg_volume_eth": number,
      "price_pressure": "buy_pressure" | "sell_pressure" | "neutral"
    }
  ],
  "stats": {
    "total_volume_eth": number,
    "total_volume_usd": number,
    "total_sales": number,
    "avg_daily_volume_eth": number,
    "peak_volume_eth": number,
    "peak_timestamp": "ISO timestamp",
    "volume_trend": "increasing" | "decreasing" | "stable" | "volatile",
    "volatility_score": number (0-100)
  },
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

// GET /nft-volume-heatmap/market?period=7d
nftVolumeHeatmapRouter.get('/market', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || '7d';

  const prompt = `NFT market-wide volume heatmap across all collections for ${period}.
Return JSON:
{
  "period": "${period}",
  "generated_at": "ISO timestamp",
  "top_collections_by_volume": [
    {
      "collection": "string",
      "volume_eth": number,
      "volume_usd": number,
      "sales_count": number,
      "volume_change_pct": number,
      "trend": "up" | "down" | "flat"
    }
  ],
  "hourly_market_heatmap": [
    { "hour_utc": number, "day_of_week": "string", "avg_volume_eth": number, "intensity": 0.0-1.0 }
  ],
  "market_summary": {
    "total_market_volume_eth": number,
    "total_market_volume_usd": number,
    "most_active_hour_utc": number,
    "most_active_day": "string",
    "market_trend": "bull" | "bear" | "neutral",
    "institutional_activity": "high" | "medium" | "low"
  },
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

nftVolumeHeatmapRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Volume Heatmap',
    version: '1.0.0',
    description: 'Collection volume trends by day/hour to time entries perfectly',
    endpoints: [
      { path: '/collection', method: 'GET', params: ['name', 'period', 'granularity'] },
      { path: '/market', method: 'GET', params: ['period'] }
    ]
  });
});

nftVolumeHeatmapRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-volume-heatmap',
    version: '1.1.0',
    description: 'Collection volume trends by day and hour to time entries and exits',
    x402_supported: true,
    x_latency_tier: 'near-real-time',
    pricing: { tier: 'standard', unit_cost_usd: 0.010 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/collection', method: 'GET', billable: true, params: ['name', 'period', 'granularity'] },
      { path: '/market', method: 'GET', billable: true, params: ['period'] },
      { path: '/lookup', method: 'GET', billable: true, params: ['name'], description: 'One-call volume intelligence with entry timing' }
    ],
    chain_to: [
      { api: 'nft-sniper-alert', reason: 'time snipe during peak liquidity windows' },
      { api: 'nft-whale-tracker', reason: 'correlate volume spikes with whale activity' }
    ],
    execution_notes: 'Volume data is AI-estimated. Use as directional signal for timing, not as exact figures.'
  });
});

nftVolumeHeatmapRouter.get('/lookup', async (req: Request, res: Response) => {
  const name = (req.query.name as string) || '';
  if (!name) return res.status(400).json({ success: false, error: 'name (collection) is required' });

  const prompt = `You are an NFT volume timing intelligence system. One-call analysis for collection: "${name}".

Return ONLY JSON:
{
  "collection": "${name}",
  "analyzed_at": "ISO timestamp",
  "current_state": {
    "floor_price_eth": number,
    "24h_volume_eth": number,
    "24h_sales": number,
    "7d_volume_change_pct": number,
    "market_phase": "accumulation|markup|distribution|markdown"
  },
  "best_entry_windows": [
    {
      "day_of_week": "Monday-Sunday",
      "hour_utc_start": number,
      "hour_utc_end": number,
      "reason": "string",
      "avg_volume_eth": number,
      "price_pressure": "buy_pressure|sell_pressure|neutral",
      "confidence": number
    }
  ],
  "worst_entry_windows": [
    { "day_of_week": "string", "hour_utc": number, "reason": "string" }
  ],
  "volume_trend": {
    "direction": "increasing|decreasing|stable|volatile",
    "momentum": "accelerating|stable|fading",
    "volatility_score": number (0-100),
    "anomalies_detected": ["string array of unusual volume events"]
  },
  "timing_recommendation": {
    "current_moment": "good_entry|bad_entry|neutral|wait",
    "next_best_window": "string description",
    "hours_until_best_window": number
  },
  "reasoning": {
    "volume_pattern_explanation": "string",
    "risk_factors": ["string array"],
    "invalidators": ["conditions that would change timing recommendation"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "current_state": number,
    "entry_windows": number,
    "timing_recommendation": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-sniper-alert", "reason": "act on snipe opportunities during peak liquidity windows", "params": { "collection": "${name}" } },
    { "api": "nft-whale-tracker", "reason": "check whale activity correlation with volume spikes" }
  ],
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 900,
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
