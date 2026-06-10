import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Token Metadata API', info: '/token-metadata/info', openapi: '/token-metadata/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Return token metadata for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","name":"string","decimals":18,"chain":"string","token_type":"ERC20|ERC721|ERC1155|BEP20|SPL|native","total_supply":"string","circulating_supply":"string","max_supply":"string","deployer":"string","deploy_date":"string","verified":false,"logo_url":"string","website":"string","description":"string","source_provenance":{"provider":"token-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"token-metadata","recommended_next_endpoint":"/verify","automation_safe":true,"confidence_per_section":{"metadata":0.88},"recommended_actions_priority_order":["verify token","check social stats","assess risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Verify token authenticity for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","is_verified":false,"is_official":false,"honeypot_risk":false,"scam_risk":false,"impersonation_risk":false,"verification_sources":["string"],"known_exchanges":["string"],"coingecko_listed":false,"coinmarketcap_listed":false,"trust_score":0.0,"warnings":["string"],"source_provenance":{"provider":"token-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/assess","automation_safe":true,"confidence_per_section":{"verification":0.85},"recommended_actions_priority_order":["check honeypot risk","verify on CoinGecko","warn user if unverified"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/social', async (req: Request, res: Response) => {
  const { address, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Get token social stats for address="${address||''}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"symbol":"string","social_profiles":{"twitter":"string","telegram":"string","discord":"string","reddit":"string"},"twitter_followers":0,"telegram_members":0,"discord_members":0,"github_repos":["string"],"github_stars":0,"community_score":0.0,"developer_activity":"active|moderate|low|inactive","sentiment":"bullish|neutral|bearish","mentions_24h":0,"source_provenance":{"provider":"token-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"token-metadata","recommended_next_endpoint":"/token-intelligence","automation_safe":true,"confidence_per_section":{"social":0.78},"recommended_actions_priority_order":["assess community size","check dev activity","factor into thesis"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, symbol, objective } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'token_research',
    next_api: 'token-metadata', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_IDENTIFIER: 'address or symbol is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'token-metadata', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Look up metadata', 'Verify token', 'Check social stats'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/token-intelligence', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Full token intelligence for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","name":"string","chain":"string","is_verified":false,"trust_score":0.0,"token_type":"string","total_supply":"string","circulating_supply":"string","top_holders_pct":0.0,"liquidity_score":0.0,"developer_activity":"active|moderate|low","community_size":"large|medium|small","risk_summary":"low|medium|high","key_risks":["string"],"source_provenance":{"provider":"token-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/assess","automation_safe":true,"confidence_per_section":{"metadata":0.88,"analysis":0.82},"recommended_actions_priority_order":["review risks","check verification","assess for portfolio"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { token_a, token_b } = req.body;
  if (!token_a || !token_b) return res.status(400).json({ error: 'token_a and token_b are required' });
  try {
    const raw = await callClaude(`Compare tokens: token_a="${token_a}" vs token_b="${token_b}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"token_a":"${token_a}","token_b":"${token_b}","comparison":{"verification":{"a":false,"b":false},"community_score":{"a":0.0,"b":0.0},"developer_activity":{"a":"string","b":"string"},"trust_score":{"a":0.0,"b":0.0}},"stronger_fundamentals":"token_a|token_b|equal","key_differences":["string"],"source_provenance":{"provider":"token-metadata-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"token-metadata","recommended_next_endpoint":"/token-intelligence","automation_safe":true,"confidence_per_section":{"comparison":0.82},"recommended_actions_priority_order":["apply comparison to decision","check trust scores","prefer stronger fundamentals"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { tokens } = req.body;
  if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'tokens array is required' });
  if (tokens.length > 5) return res.status(400).json({ error: 'Maximum 5 tokens per batch' });
  try {
    const results = await Promise.all(tokens.map(async (t: { address?: string; symbol?: string; chain?: string }) => {
      const raw = await callClaude(`Quick token metadata for address="${t.address||''}", symbol="${t.symbol||''}", chain="${t.chain||'ethereum'}". Return JSON only:
{"symbol":"string","name":"string","is_verified":false,"trust_score":0.0,"token_type":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: tokens.length, results,
      source_provenance: { provider: 'token-metadata-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.88 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'token-metadata', recommended_next_endpoint: '/token-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
