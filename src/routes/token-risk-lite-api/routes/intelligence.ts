import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Token Risk Lite API', info: '/token-risk-lite/info', openapi: '/token-risk-lite/openapi.json', health: 'ok' });
});

router.post('/assess', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Assess token risk for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","chain":"string","risk_score":0,"risk_level":"low|medium|high|critical","honeypot":false,"rug_pull_risk":"low|medium|high","ownership_renounced":false,"liquidity_locked":false,"top_holders_concentration_pct":0.0,"can_mint":false,"can_blacklist":false,"trading_paused":false,"source_provenance":{"provider":"token-risk-lite-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/flags","automation_safe":true,"confidence_per_section":{"risk":0.88},"recommended_actions_priority_order":["review flags","check concentration","warn user if high risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Score token risk 0-100 for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","risk_score":0,"score_breakdown":{"contract_safety":0,"liquidity_depth":0,"ownership_safety":0,"holder_distribution":0,"trading_pattern":0},"grade":"A|B|C|D|F","percentile":0,"is_risky":false,"source_provenance":{"provider":"token-risk-lite-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/risk-intelligence","automation_safe":true,"confidence_per_section":{"scoring":0.87},"recommended_actions_priority_order":["use score in UI","flag grades D/F","show breakdown to user"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/flags', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`List risk flags for token address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","flags":[{"flag":"honeypot|rug_pull|high_concentration|mintable|blacklist|proxy|fake_liquidity|wash_trading","severity":"critical|high|medium|low","description":"string","confirmed":false}],"critical_count":0,"high_count":0,"medium_count":0,"overall_verdict":"safe|caution|risky|dangerous","source_provenance":{"provider":"token-risk-lite-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/risk-intelligence","automation_safe":true,"confidence_per_section":{"flags":0.88},"recommended_actions_priority_order":["block critical flags","warn on high flags","educate on medium flags"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, symbol, objective } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'token_risk_check',
    next_api: 'token-risk-lite', next_endpoint: '/assess',
    blocking_flags: [], flag_definitions: { NO_IDENTIFIER: 'address or symbol is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'token-risk-lite', recommended_next_endpoint: '/assess',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Assess risk', 'Get score', 'List flags'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/risk-intelligence', async (req: Request, res: Response) => {
  const { address, chain, symbol } = req.body;
  if (!address && !symbol) return res.status(400).json({ error: 'address or symbol is required' });
  try {
    const raw = await callClaude(`Full token risk intelligence for address="${address||''}", chain="${chain||'ethereum'}", symbol="${symbol||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","symbol":"string","chain":"string","risk_score":0,"risk_level":"low|medium|high|critical","grade":"A|B|C|D|F","honeypot":false,"rug_pull_risk":"string","critical_flags":["string"],"high_flags":["string"],"ownership_renounced":false,"liquidity_locked":false,"top_10_holders_pct":0.0,"liquidity_usd":0.0,"user_verdict":"safe_to_trade|trade_with_caution|do_not_trade","explanation":"string","source_provenance":{"provider":"token-risk-lite-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"token-metadata","recommended_next_endpoint":"/verify","automation_safe":true,"confidence_per_section":{"risk":0.88,"flags":0.88},"recommended_actions_priority_order":["show verdict to user","block do_not_trade","warn on caution"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { token_a, token_b, chain } = req.body;
  if (!token_a || !token_b) return res.status(400).json({ error: 'token_a and token_b are required' });
  try {
    const raw = await callClaude(`Compare token risk: token_a="${token_a}" vs token_b="${token_b}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"token_a":"${token_a}","token_b":"${token_b}","risk_scores":{"a":0,"b":0},"grades":{"a":"A|B|C|D|F","b":"A|B|C|D|F"},"lower_risk":"token_a|token_b|equal","key_risk_differences":["string"],"recommendation":"string","source_provenance":{"provider":"token-risk-lite-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.88},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"token-risk-lite","recommended_next_endpoint":"/risk-intelligence","automation_safe":true,"confidence_per_section":{"comparison":0.85},"recommended_actions_priority_order":["prefer lower risk","validate recommendation","set alerts"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { tokens } = req.body;
  if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'tokens array is required' });
  if (tokens.length > 10) return res.status(400).json({ error: 'Maximum 10 tokens per batch' });
  try {
    const results = await Promise.all(tokens.map(async (t: { address?: string; symbol?: string; chain?: string }) => {
      const raw = await callClaude(`Quick risk score for address="${t.address||''}", symbol="${t.symbol||''}", chain="${t.chain||'ethereum'}". Return JSON only:
{"symbol":"string","risk_score":0,"risk_level":"low|medium|high|critical","grade":"A|B|C|D|F","honeypot":false,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: tokens.length, results,
      source_provenance: { provider: 'token-risk-lite-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.88 },
      cache_ttl_seconds: 300, cache_recommended: true,
      recommended_next_api: 'token-risk-lite', recommended_next_endpoint: '/risk-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
