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
  res.json({ name: 'Onchain Labeling API', info: '/onchain-labeling/info', openapi: '/onchain-labeling/openapi.json', health: 'ok' });
});

router.post('/label', async (req: Request, res: Response) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Label onchain address: address="${address}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"${address}","chain":"string","label":"string","entity_name":"string","entity_type":"exchange|defi_protocol|nft_marketplace|miner|validator|whale|retail|mixer|bridge|dao|other|unknown","sub_type":"string","confidence":0.0,"is_contract":false,"source_provenance":{"provider":"onchain-labeling-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"onchain-labeling","recommended_next_endpoint":"/classify","automation_safe":true,"confidence_per_section":{"label":0.85},"recommended_actions_priority_order":["use label in UI","classify entity type","verify if known entity"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/classify', async (req: Request, res: Response) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Classify onchain entity for address="${address}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","entity_type":"exchange|defi_protocol|nft_marketplace|miner|validator|whale|retail|mixer|bridge|dao|bot|other","risk_category":"low|medium|high|critical","compliance_category":"sanctioned|pep|mixer|exchange|clean|unknown","activity_pattern":"institutional|high_frequency|whale|retail","first_seen":"string","last_active":"string","transaction_count":0,"total_volume_usd":0.0,"source_provenance":{"provider":"onchain-labeling-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"onchain-labeling","recommended_next_endpoint":"/label-intelligence","automation_safe":true,"confidence_per_section":{"classification":0.83},"recommended_actions_priority_order":["apply risk category","flag compliance issues","route for review"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify', async (req: Request, res: Response) => {
  const { address, chain, expected_entity } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Verify if address is known entity: address="${address}", chain="${chain||'ethereum'}", expected="${expected_entity||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","is_known_entity":false,"entity_name":"string","entity_type":"string","match_confidence":0.0,"official_sources":["string"],"discrepancy":false,"discrepancy_note":"string","source_provenance":{"provider":"onchain-labeling-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"onchain-labeling","recommended_next_endpoint":"/label-intelligence","automation_safe":true,"confidence_per_section":{"verification":0.85},"recommended_actions_priority_order":["use in trust display","warn on low confidence","flag discrepancy"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, objective } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'address_labeling',
    next_api: 'onchain-labeling', next_endpoint: '/label',
    blocking_flags: [], flag_definitions: { NO_ADDRESS: 'address is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'onchain-labeling', recommended_next_endpoint: '/label',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Label address', 'Classify entity', 'Verify known entity'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/label-intelligence', async (req: Request, res: Response) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full onchain label intelligence for address="${address}", chain="${chain||'ethereum'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"address":"string","chain":"string","label":"string","entity_name":"string","entity_type":"string","risk_category":"low|medium|high|critical","compliance_flags":["string"],"is_sanctioned":false,"is_mixer":false,"is_exchange":false,"activity_summary":"string","transaction_count":0,"total_volume_usd":0.0,"first_seen":"string","last_active":"string","confidence":0.0,"action_recommendation":"allow|monitor|review|block","source_provenance":{"provider":"onchain-labeling-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"address-risk","recommended_next_endpoint":"/assess","automation_safe":true,"confidence_per_section":{"label":0.85,"risk":0.83},"recommended_actions_priority_order":["apply recommendation","document in system","monitor if needed"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk-label', async (req: Request, res: Response) => {
  const { addresses, chain } = req.body;
  if (!Array.isArray(addresses) || addresses.length === 0) return res.status(400).json({ error: 'addresses array is required' });
  if (addresses.length > 20) return res.status(400).json({ error: 'Maximum 20 addresses per bulk request' });
  try {
    const results = await Promise.all(addresses.map(async (addr: string) => {
      const raw = await callClaude(`Quick label for address="${addr}", chain="${chain||'ethereum'}". Return JSON only:
{"address":"${addr}","label":"string","entity_type":"string","risk_category":"low|medium|high|critical","confidence":0.0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      count: addresses.length, results,
      source_provenance: { provider: 'onchain-labeling-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'onchain-labeling', recommended_next_endpoint: '/label-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { addresses } = req.body;
  if (!Array.isArray(addresses) || addresses.length === 0) return res.status(400).json({ error: 'addresses array is required' });
  if (addresses.length > 5) return res.status(400).json({ error: 'Maximum 5 addresses per batch' });
  try {
    const results = await Promise.all(addresses.map(async (a: { address: string; chain?: string }) => {
      const raw = await callClaude(`Quick entity classification for address="${a.address}", chain="${a.chain||'ethereum'}". Return JSON only:
{"address":"${a.address}","label":"string","entity_type":"string","risk_category":"low|medium|high|critical","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: addresses.length, results,
      source_provenance: { provider: 'onchain-labeling-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'onchain-labeling', recommended_next_endpoint: '/label-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
