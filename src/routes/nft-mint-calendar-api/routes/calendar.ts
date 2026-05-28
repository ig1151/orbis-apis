import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftMintCalendarRouter = Router();

nftMintCalendarRouter.get('/upcoming', async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 30);
  const chain = (req.query.chain as string) || 'ethereum';
  const minHype = parseInt(req.query.minHype as string) || 0;

  const prompt = `You are an NFT mint calendar. Return EXACTLY 5 upcoming mints for the next ${days} days on ${chain} with hype_score >= ${minHype}.

Return ONLY a JSON object, no markdown, no explanation:
{
  "chain": "${chain}",
  "days_ahead": ${days},
  "generated_at": "2025-06-01T00:00:00Z",
  "mints": [
    {
      "project_name": "string",
      "description": "one sentence",
      "chain": "${chain}",
      "mint_date": "ISO timestamp",
      "mint_type": "public",
      "price_eth": 0.08,
      "price_usd": 280,
      "supply": 5000,
      "max_per_wallet": 3,
      "hype_score": 75,
      "category": "pfp",
      "team_credibility": "doxxed",
      "twitter_followers": 12000,
      "discord_members": 8000,
      "risk_level": "medium",
      "estimated_sellout": true
    }
  ],
  "summary": {
    "total_mints": 5,
    "high_hype_count": 2,
    "free_mints": 0,
    "hottest_mint": "project name"
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

nftMintCalendarRouter.get('/today', async (req: Request, res: Response) => {
  const prompt = `NFT mints happening today. Return ONLY JSON, no markdown:
{
  "date": "2025-06-01",
  "live_now": [
    { "project": "string", "chain": "ethereum", "price_eth": 0.05, "supply": 3000, "minted_pct": 45, "hype_score": 70 }
  ],
  "starting_soon": [
    { "project": "string", "chain": "ethereum", "starts_in_minutes": 90, "price_eth": 0.08, "hype_score": 65 }
  ],
  "confidence": 0.8
}`;
  try {
    const raw = await callAI(prompt, undefined, 800);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

nftMintCalendarRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Mint Calendar',
    version: '1.0.0',
    description: 'Upcoming mints with hype score, price, and supply',
    endpoints: [
      { path: '/upcoming', method: 'GET', params: ['days', 'chain', 'minHype'] },
      { path: '/today', method: 'GET', params: [] }
    ]
  });
});

nftMintCalendarRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-mint-calendar',
    version: '1.1.0',
    description: 'Upcoming NFT mints with hype scores, pricing, supply, and risk',
    x402_supported: true,
    x_latency_tier: 'standard',
    pricing: { tier: 'standard', unit_cost_usd: 0.008 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/upcoming', method: 'GET', billable: true, params: ['days', 'chain', 'minHype'] },
      { path: '/today', method: 'GET', billable: true },
      { path: '/lookup', method: 'GET', billable: true, params: ['project'], description: 'One-call mint intelligence for a specific project' }
    ],
    chain_to: [
      { api: 'nft-influencer-tracking', reason: 'check if influencers are shilling this mint' },
      { api: 'nft-whale-tracker', reason: 'check if whales are whitelisted or accumulating' }
    ],
    execution_notes: 'Mint data is AI-estimated. Verify contract and price on official project channels before minting.'
  });
});

nftMintCalendarRouter.get('/lookup', async (req: Request, res: Response) => {
  const project = (req.query.project as string) || '';
  if (!project) return res.status(400).json({ success: false, error: 'project is required' });

  const prompt = `You are an NFT mint intelligence analyst. Full one-call analysis for upcoming mint project: "${project}".

Return ONLY JSON:
{
  "project": "${project}",
  "analyzed_at": "ISO timestamp",
  "mint_details": {
    "mint_date": "ISO timestamp",
    "mint_type": "public|whitelist|dutch_auction|free",
    "price_eth": number,
    "price_usd": number,
    "supply": number,
    "max_per_wallet": number,
    "chain": "ethereum|polygon|solana"
  },
  "hype_analysis": {
    "hype_score": number (0-100),
    "twitter_followers": number,
    "discord_members": number,
    "discord_growth_7d_pct": number,
    "influencer_mentions": number,
    "whale_whitelist_count": number,
    "hype_factors": ["string array"]
  },
  "team_assessment": {
    "credibility": "doxxed|anonymous_reputable|anonymous_unknown",
    "previous_projects": ["string array"],
    "vc_backed": boolean,
    "notable_advisors": ["string array"]
  },
  "risk_assessment": {
    "rug_probability": number (0-1),
    "sellout_probability": number (0-1),
    "post_mint_dump_risk": "high|medium|low",
    "risk_flags": ["string array"],
    "risk_score": number (0-100)
  },
  "post_mint_projection": {
    "estimated_floor_24h_eth": number,
    "estimated_floor_7d_eth": number,
    "expected_roi_pct": number,
    "comparable_projects": ["string array"]
  },
  "reasoning": {
    "bull_case": "string",
    "bear_case": "string",
    "key_catalysts": ["string array"],
    "invalidators": ["conditions that would make this a bad mint"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "hype_analysis": number,
    "team_assessment": number,
    "risk_assessment": number,
    "post_mint_projection": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-influencer-tracking", "reason": "verify influencer sentiment around this mint" },
    { "api": "nft-whale-tracker", "reason": "confirm whale participation signals" }
  ],
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 1800,
    "latency_tier": "standard"
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
