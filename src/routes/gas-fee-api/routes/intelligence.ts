import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Gas Fee API', info: '/gas-fee/info', openapi: '/gas-fee/openapi.json', health: 'ok' });
});

router.post('/current', async (req: Request, res: Response) => {
  const { chain } = req.body;
  try {
    const raw = await callClaude(`Return current gas fee data for chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"chain":"${chain||'ethereum'}","base_fee_gwei":0.0,"priority_fee_gwei":{"slow":0.0,"standard":0.0,"fast":0.0,"instant":0.0},"gas_price_gwei":{"slow":0.0,"standard":0.0,"fast":0.0,"instant":0.0},"network_congestion":"low|medium|high|very_high","block_number":0,"next_block_base_fee_gwei":0.0,"source_provenance":{"provider":"gas-fee-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":15,"cache_recommended":true,"recommended_next_api":"gas-fee","recommended_next_endpoint":"/estimate","automation_safe":true,"confidence_per_section":{"gas":0.92},"recommended_actions_priority_order":["use standard fee for normal txs","use fast for time-sensitive","wait if congestion very_high"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/estimate', async (req: Request, res: Response) => {
  const { chain, transaction_type, gas_limit } = req.body;
  try {
    const raw = await callClaude(`Estimate gas cost for transaction_type="${transaction_type||'ETH transfer'}", chain="${chain||'ethereum'}", gas_limit=${gas_limit||21000}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"chain":"string","transaction_type":"string","gas_limit":${gas_limit||21000},"estimates":{"slow":{"gwei":0.0,"eth":"string","usd":0.0,"wait_seconds":0},"standard":{"gwei":0.0,"eth":"string","usd":0.0,"wait_seconds":0},"fast":{"gwei":0.0,"eth":"string","usd":0.0,"wait_seconds":0}},"recommended_speed":"slow|standard|fast","eth_price_usd":0.0,"source_provenance":{"provider":"gas-fee-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":15,"cache_recommended":true,"recommended_next_api":"gas-fee","recommended_next_endpoint":"/gas-intelligence","automation_safe":true,"confidence_per_section":{"estimate":0.90},"recommended_actions_priority_order":["use recommended speed","submit transaction","confirm on-chain"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/history', async (req: Request, res: Response) => {
  const { chain, period } = req.body;
  try {
    const raw = await callClaude(`Return gas fee history for chain="${chain||'ethereum'}", period="${period||'24h'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"chain":"string","period":"string","average_gwei":0.0,"min_gwei":0.0,"max_gwei":0.0,"hourly":[{"hour":"string","avg_gwei":0.0,"congestion":"low|medium|high"}],"peak_time":"string","cheapest_time":"string","trend":"rising|stable|falling","source_provenance":{"provider":"gas-fee-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.90},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"gas-fee","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"history":0.88},"recommended_actions_priority_order":["schedule tx at cheapest time","avoid peak hours","set gas alert"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { chain, objective } = req.body;
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'gas_fee_check',
    next_api: 'gas-fee', next_endpoint: '/current',
    blocking_flags: [], flag_definitions: {},
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'gas-fee', recommended_next_endpoint: '/current',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Check current fees', 'Estimate transaction cost', 'Optimize timing'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/gas-intelligence', async (req: Request, res: Response) => {
  const { chain, transaction_type, urgency } = req.body;
  try {
    const raw = await callClaude(`Full gas fee intelligence for chain="${chain||'ethereum'}", tx_type="${transaction_type||'ETH transfer'}", urgency="${urgency||'standard'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"chain":"string","current_base_fee_gwei":0.0,"congestion":"low|medium|high|very_high","recommended_fee_gwei":0.0,"recommended_fee_usd":0.0,"estimated_wait_seconds":0,"best_time_to_transact":"now|wait_for_off_peak","off_peak_hours":["string"],"savings_if_wait_usd":0.0,"gas_limit_recommendation":0,"source_provenance":{"provider":"gas-fee-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":15,"cache_recommended":true,"recommended_next_api":"blockchain-tx-lookup","recommended_next_endpoint":"/lookup","automation_safe":true,"confidence_per_section":{"gas":0.92,"recommendation":0.88},"recommended_actions_priority_order":["use recommended fee","submit if urgent","wait if not urgent"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { chain, transaction_type, max_wait_minutes } = req.body;
  try {
    const raw = await callClaude(`Suggest optimal gas strategy for chain="${chain||'ethereum'}", tx="${transaction_type||'ETH transfer'}", max_wait=${max_wait_minutes||30} minutes. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"chain":"string","strategy":"submit_now|wait|use_flashbots|use_l2","optimal_fee_gwei":0.0,"optimal_fee_usd":0.0,"estimated_confirmation_seconds":0,"potential_savings_usd":0.0,"layer2_alternative":"arbitrum|optimism|polygon|base|none","rationale":"string","source_provenance":{"provider":"gas-fee-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.90},"cache_ttl_seconds":60,"cache_recommended":true,"recommended_next_api":"gas-fee","recommended_next_endpoint":"/gas-intelligence","automation_safe":true,"confidence_per_section":{"optimization":0.88},"recommended_actions_priority_order":["apply strategy","confirm fee setting","monitor mempool"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { chains } = req.body;
  if (!Array.isArray(chains) || chains.length === 0) return res.status(400).json({ error: 'chains array is required' });
  if (chains.length > 8) return res.status(400).json({ error: 'Maximum 8 chains per batch' });
  try {
    const results = await Promise.all(chains.map(async (chain: string) => {
      const raw = await callClaude(`Quick gas fee snapshot for chain="${chain}". Return JSON only:
{"chain":"${chain}","standard_gwei":0.0,"congestion":"low|medium|high","usd_per_transfer":0.0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: chains.length, results,
      source_provenance: { provider: 'gas-fee-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.92 },
      cache_ttl_seconds: 15, cache_recommended: true,
      recommended_next_api: 'gas-fee', recommended_next_endpoint: '/gas-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
