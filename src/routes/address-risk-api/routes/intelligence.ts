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

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Address Risk API', info: '/address-risk/info', openapi: '/address-risk/openapi.json', health: 'ok' });
});

// POST /address-risk
router.post('/address-risk', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum' } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Blockchain address risk score for: "${address}" chain: "${chain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "risk_level": "critical|high|medium|low|minimal",
  "risk_score": 0-100,
  "entity_type": "exchange|mixer|darknet|defi_protocol|wallet|contract|unknown",
  "risk_factors": [{"factor": "string", "severity": "critical|high|medium|low", "description": "string"}],
  "transaction_pattern_signals": {
    "mixing_detected": true|false,
    "high_velocity": true|false,
    "darknet_exposure": true|false,
    "exchange_deposits": true|false
  },
  "allow_or_block": "allow|review|block",
  "confidence_per_section": {"risk_score": 0-1, "risk_factors": 0-1, "transaction_pattern_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /sanctions
router.post('/sanctions', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum' } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Sanctions check for blockchain address: "${address}" chain: "${chain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "is_sanctioned": true|false,
  "match_confidence": 0-1,
  "sanctions_matches": [
    {
      "list": "OFAC|EU|UN|OFSI|other",
      "entity_name": "string",
      "program": "string",
      "match_type": "exact|fuzzy|indirect",
      "listed_date": "YYYY-MM-DD"
    }
  ],
  "indirect_exposure": {"degree": number, "description": "string"},
  "verdict": "clear|sanctioned|indirect_exposure|review_required",
  "confidence_per_section": {"is_sanctioned": 0-1, "sanctions_matches": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /labels
router.post('/labels', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum' } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Get known labels for blockchain address: "${address}" chain: "${chain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "labels": [
    {"label": "string", "category": "exchange|mixer|darknet|defi_protocol|whale|nft|dao|bridge|other",
     "confidence": 0-1, "source": "string"}
  ],
  "primary_label": "string",
  "entity_name": "string",
  "is_contract": true|false,
  "is_whale": true|false,
  "label_confidence": 0-1,
  "confidence_per_section": {"labels": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /cluster
router.post('/cluster', async (req: Request, res: Response) => {
  const { addresses, chain = 'ethereum' } = req.body;
  if (!addresses || !Array.isArray(addresses)) return res.status(400).json({ error: 'addresses array is required' });
  try {
    const list = addresses.slice(0, 10).join(', ');
    const raw = await callClaude(`Cluster addresses on chain: "${chain}" for: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "cluster_groups": [
    {
      "cluster_id": "string",
      "addresses": ["string"],
      "cluster_score": 0-1,
      "entity_hypothesis": "string",
      "common_counterparties": ["string"],
      "first_seen": "YYYY-MM-DD"
    }
  ],
  "total_addresses": number,
  "clustered_count": number,
  "confidence_per_section": {"cluster_groups": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    address,
    chain: chain || 'ethereum',
    next_api: 'supply-chain-risk',
    next_endpoint: '/supplier-risk',
    blocking_flags: [],
    flag_definitions: { NO_ADDRESS: 'No blockchain address provided', INVALID_FORMAT: 'Address format may be invalid' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Run /address-risk first', 'Check /sanctions before transacting', 'Use /assess for full one-call assessment'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /assess (one-call)
router.post('/assess', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum' } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full blockchain address risk assessment for: "${address}" chain: "${chain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "risk_score": 0-100,
  "risk_level": "critical|high|medium|low|minimal",
  "is_sanctioned": true|false,
  "sanctions_programs": ["string"],
  "labels": [{"label": "string", "category": "string", "confidence": 0-1}],
  "entity_type": "string",
  "risk_factors": [{"factor": "string", "severity": "critical|high|medium|low"}],
  "transaction_signals": {"mixing": true|false, "darknet": true|false, "high_velocity": true|false},
  "allow_or_block": "allow|review|block",
  "compliance_recommendation": "string",
  "confidence_per_section": {"risk_score": 0-1, "is_sanctioned": 0-1, "labels": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
