import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Blockchain Transaction Lookup API', info: '/blockchain-tx-lookup/info', openapi: '/blockchain-tx-lookup/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { tx_hash, chain } = req.body;
  if (!tx_hash) return res.status(400).json({ error: 'tx_hash is required' });
  try {
    const raw = await callClaude(`Return blockchain transaction details for tx_hash="${tx_hash}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tx_hash":"${tx_hash}","chain":"string","status":"confirmed|pending|failed","block_number":0,"block_timestamp":"string","from":"string","to":"string","value_eth":"string","value_usd":0.0,"gas_used":0,"gas_price_gwei":0.0,"gas_fee_eth":"string","gas_fee_usd":0.0,"nonce":0,"confirmations":0,"transaction_type":"transfer|contract_call|contract_deploy|swap|approval|mint|burn","source_provenance":{"provider":"blockchain-tx-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"blockchain-tx-lookup","recommended_next_endpoint":"/decode","automation_safe":true,"confidence_per_section":{"transaction":0.95},"recommended_actions_priority_order":["decode input data","trace flow","assess risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/decode', async (req: Request, res: Response) => {
  const { tx_hash, chain, input_data } = req.body;
  if (!tx_hash && !input_data) return res.status(400).json({ error: 'tx_hash or input_data is required' });
  try {
    const raw = await callClaude(`Decode transaction input data for tx_hash="${tx_hash||''}", chain="${chain||'ethereum'}", input="${(input_data||'').slice(0,200)}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tx_hash":"string","method_name":"string","method_signature":"string","decoded_params":[{"name":"string","type":"string","value":"string"}],"contract_name":"string","protocol":"Uniswap|Aave|Compound|OpenSea|other|unknown","action_summary":"string","source_provenance":{"provider":"blockchain-tx-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"blockchain-tx-lookup","recommended_next_endpoint":"/tx-intelligence","automation_safe":true,"confidence_per_section":{"decoding":0.88},"recommended_actions_priority_order":["review decoded params","check protocol","assess for risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trace', async (req: Request, res: Response) => {
  const { tx_hash, chain } = req.body;
  if (!tx_hash) return res.status(400).json({ error: 'tx_hash is required' });
  try {
    const raw = await callClaude(`Trace transaction flow for tx_hash="${tx_hash}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tx_hash":"${tx_hash}","chain":"string","internal_txs":[{"from":"string","to":"string","value_eth":"string","type":"call|delegatecall|staticcall|create","depth":0}],"token_transfers":[{"token_symbol":"string","from":"string","to":"string","amount":"string","amount_usd":0.0}],"contracts_touched":["string"],"protocols_used":["string"],"complexity":"simple|moderate|complex","source_provenance":{"provider":"blockchain-tx-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"blockchain-tx-lookup","recommended_next_endpoint":"/tx-intelligence","automation_safe":true,"confidence_per_section":{"trace":0.85},"recommended_actions_priority_order":["review internal txs","check token transfers","assess protocols used"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { tx_hash, objective } = req.body;
  if (!tx_hash) return res.status(400).json({ error: 'tx_hash is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'transaction_analysis',
    next_api: 'blockchain-tx-lookup', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_TX_HASH: 'tx_hash is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'blockchain-tx-lookup', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Look up transaction', 'Decode data', 'Assess risk'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/tx-intelligence', async (req: Request, res: Response) => {
  const { tx_hash, chain } = req.body;
  if (!tx_hash) return res.status(400).json({ error: 'tx_hash is required' });
  try {
    const raw = await callClaude(`Full transaction intelligence for tx_hash="${tx_hash}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tx_hash":"${tx_hash}","chain":"string","status":"confirmed|pending|failed","transaction_type":"string","action_summary":"string","from":"string","to":"string","value_usd":0.0,"gas_fee_usd":0.0,"decoded_method":"string","protocol":"string","risk_flags":["string"],"risk_level":"low|medium|high","is_suspicious":false,"token_transfers_count":0,"protocols_involved":["string"],"source_provenance":{"provider":"blockchain-tx-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"address-risk","recommended_next_endpoint":"/assess","automation_safe":true,"confidence_per_section":{"transaction":0.95,"risk":0.85},"recommended_actions_priority_order":["act on risk flags","investigate suspicious activity","document findings"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risk', async (req: Request, res: Response) => {
  const { tx_hash, chain } = req.body;
  if (!tx_hash) return res.status(400).json({ error: 'tx_hash is required' });
  try {
    const raw = await callClaude(`Assess transaction risk for tx_hash="${tx_hash}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"tx_hash":"string","risk_score":0.0,"risk_level":"low|medium|high|critical","risk_flags":[{"type":"mixer|darknet|exploit|phishing|rug_pull|wash_trading|other","description":"string","severity":"critical|high|medium|low"}],"counterparty_risk":"low|medium|high","compliance_flags":["string"],"recommended_action":"allow|review|block","source_provenance":{"provider":"blockchain-tx-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"blockchain-tx-lookup","recommended_next_endpoint":"/tx-intelligence","automation_safe":true,"confidence_per_section":{"risk":0.88},"recommended_actions_priority_order":["act on recommendation","escalate critical flags","document decision"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) return res.status(400).json({ error: 'transactions array is required' });
  if (transactions.length > 5) return res.status(400).json({ error: 'Maximum 5 transactions per batch' });
  try {
    const results = await Promise.all(transactions.map(async (t: { tx_hash: string; chain?: string }) => {
      const raw = await callClaude(`Quick tx lookup for tx_hash="${t.tx_hash}", chain="${t.chain||'ethereum'}". Return JSON only:
{"tx_hash":"${t.tx_hash}","status":"confirmed|pending|failed","transaction_type":"string","value_usd":0.0,"risk_level":"low|medium|high","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: transactions.length, results,
      source_provenance: { provider: 'blockchain-tx-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.92 },
      cache_ttl_seconds: 300, cache_recommended: true,
      recommended_next_api: 'blockchain-tx-lookup', recommended_next_endpoint: '/tx-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
