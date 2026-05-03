import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { analyzeContract } from '../services/analyzerService';

const router = Router();

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

const ADDRESS_SCHEMA = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required();

function meta(startMs: number, cost: number) {
  return { latency_ms: Date.now() - startMs, estimated_cost: cost };
}

async function callAI(prompt: string, maxTokens = 1000): Promise<any> {
  const res = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  const raw = res.data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function fetchContractData(address: string) {
  const [sourceRes, txRes] = await Promise.all([
    axios.get(ETHERSCAN_BASE, { params: { chainid: 1, module: 'contract', action: 'getsourcecode', address, apikey: ETHERSCAN_KEY }, timeout: 10000 }),
    axios.get(ETHERSCAN_BASE, { params: { chainid: 1, module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, sort: 'desc', page: 1, offset: 10, apikey: ETHERSCAN_KEY }, timeout: 10000 }),
  ]);
  const source = sourceRes.data.result?.[0] || {};
  const isVerified = !!(source.SourceCode && source.SourceCode !== '');
  return {
    address,
    contractName: source.ContractName || 'Unknown',
    compiler: source.CompilerVersion || 'Unknown',
    isProxy: source.Proxy === '1',
    isVerified,
    recentTxs: Array.isArray(txRes.data.result) ? txRes.data.result.length : 0,
    sourceCode: isVerified ? source.SourceCode.slice(0, 6000) : 'Not verified',
  };
}

// POST /scan-contract
router.post('/scan-contract', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await analyzeContract(value.address);
    return res.json({ ...result, metadata: meta(start, 0.004) });
  } catch (err: any) {
    return res.status(500).json({ error: 'scan_failed', message: err.message });
  }
});

// POST /score-risk
router.post('/score-risk', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract risk scoring engine. Score this contract. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Verified: ${c.isVerified} | Proxy: ${c.isProxy} | Recent TXs: ${c.recentTxs}
Source: ${c.sourceCode}
{"address":"${c.address}","risk_score":0.0,"risk_level":"low|medium|high|critical","scores":{"reentrancy":0.0,"access_control":0.0,"overflow":0.0,"centralization":0.0,"upgrade_risk":0.0},"overall_grade":"A|B|C|D|F","safe_to_interact":true,"confidence":0.0,"summary":"one sentence"}`);
    return res.json({ ...ai, contract_name: c.contractName, verified: c.isVerified, timestamp: new Date().toISOString(), metadata: meta(start, 0.0025) });
  } catch (err: any) {
    return res.status(500).json({ error: 'score_failed', message: err.message });
  }
});

// POST /detect-vulnerabilities
router.post('/detect-vulnerabilities', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract vulnerability detector. Find vulnerabilities in this contract. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Verified: ${c.isVerified} | Compiler: ${c.compiler}
Source: ${c.sourceCode}
{"address":"${c.address}","vulnerabilities":[{"type":"reentrancy|overflow|access_control|flash_loan|oracle_manipulation|front_running|other","severity":"low|medium|high|critical","description":"one sentence","exploitable":true,"location":"function or line if known"}],"total_found":0,"critical_count":0,"exploit_risk":"low|medium|high|critical","audit_required":true,"confidence":0.0}`, 1500);
    return res.json({ ...ai, contract_name: c.contractName, verified: c.isVerified, timestamp: new Date().toISOString(), metadata: meta(start, 0.006) });
  } catch (err: any) {
    return res.status(500).json({ error: 'vulnerability_detection_failed', message: err.message });
  }
});

// POST /classify-contract
router.post('/classify-contract', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract classifier. Classify this contract. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Verified: ${c.isVerified} | Proxy: ${c.isProxy}
Source: ${c.sourceCode}
{"address":"${c.address}","contract_type":"token|defi|nft|dao|bridge|staking|vault|multisig|proxy|unknown","subtype":"string","standards":["ERC20|ERC721|ERC1155|ERC4626|other"],"is_upgradeable":false,"has_admin":false,"has_pause":false,"has_mint":false,"has_burn":false,"confidence":0.0,"summary":"one sentence"}`);
    return res.json({ ...ai, contract_name: c.contractName, verified: c.isVerified, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'classification_failed', message: err.message });
  }
});

// POST /compare-contracts
router.post('/compare-contracts', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    addresses: Joi.array().items(ADDRESS_SCHEMA).min(2).max(5).required()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const contracts = await Promise.all(value.addresses.map((a: string) => fetchContractData(a)));
    const summary = contracts.map(c => `${c.address}: ${c.contractName}, verified=${c.isVerified}, proxy=${c.isProxy}, txs=${c.recentTxs}`).join('\n');
    const ai = await callAI(`You are a smart contract comparison engine. Compare these contracts. Return ONLY valid JSON, no markdown.
Contracts:
${summary}
{"addresses":[],"safest":"address","riskiest":"address","comparison":[{"address":"string","contract_name":"string","risk_score":0.0,"trust_score":0.0,"recommendation":"use|avoid|investigate"}],"key_differences":["string"],"confidence":0.0}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.0045) });
  } catch (err: any) {
    return res.status(500).json({ error: 'comparison_failed', message: err.message });
  }
});

// POST /monitor-contract
router.post('/monitor-contract', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract monitor. Assess current monitoring signals for this contract. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Recent TXs: ${c.recentTxs} | Verified: ${c.isVerified} | Proxy: ${c.isProxy}
{"address":"${c.address}","signals":[{"type":"activity|upgrade|ownership|pause|exploit_attempt","description":"one sentence","severity":"low|medium|high|critical","detected":true}],"alert_level":"none|watch|alert|critical","activity_trend":"increasing|stable|decreasing","next_check_ms":3600000,"confidence":0.0,"summary":"one sentence"}`);
    return res.json({ ...ai, contract_name: c.contractName, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'monitor_failed', message: err.message });
  }
});

// POST /summarize-findings
router.post('/summarize-findings', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    address: ADDRESS_SCHEMA,
    findings: Joi.object().optional()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract audit summarizer. Produce an agent-ready summary. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Verified: ${c.isVerified} | Proxy: ${c.isProxy} | Recent TXs: ${c.recentTxs}
Previous findings: ${JSON.stringify(value.findings || {})}
Source: ${c.sourceCode}
{"address":"${c.address}","executive_summary":"two sentences","overall_risk":"low|medium|high|critical","key_findings":["string"],"recommended_actions":["string"],"safe_to_use":true,"requires_audit":false,"agent_verdict":"approve|investigate|reject","confidence":0.0}`);
    return res.json({ ...ai, contract_name: c.contractName, verified: c.isVerified, timestamp: new Date().toISOString(), metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'summarize_failed', message: err.message });
  }
});

// POST /rank-contracts
router.post('/rank-contracts', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    addresses: Joi.array().items(ADDRESS_SCHEMA).min(2).max(10).required(),
    objective: Joi.string().valid('safety', 'trust', 'activity', 'defi_use').default('safety'),
    top_n: Joi.number().integer().min(1).max(10).default(3)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const contracts = await Promise.all(value.addresses.map((a: string) => fetchContractData(a)));
    const summary = contracts.map(c => `${c.address}: ${c.contractName}, verified=${c.isVerified}, proxy=${c.isProxy}, txs=${c.recentTxs}`).join('\n');
    const ai = await callAI(`You are a smart contract ranking engine. Rank these contracts by ${value.objective}. Return ONLY valid JSON, no markdown.
Contracts:
${summary}
{"objective":"${value.objective}","ranked":[{"rank":1,"address":"string","contract_name":"string","score":0.0,"recommendation":"use|investigate|avoid","reason":"one sentence"}],"top_pick":"address","summary":"one sentence","confidence":0.0}`);
    const ranked = { ...ai, ranked: (ai.ranked || []).slice(0, value.top_n) };
    return res.json({ ...ranked, timestamp: new Date().toISOString(), metadata: meta(start, 0.005) });
  } catch (err: any) {
    return res.status(500).json({ error: 'ranking_failed', message: err.message });
  }
});

// Legacy GET /analyze
router.get('/analyze', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({ address: ADDRESS_SCHEMA }).validate(req.query);
  if (error) { res.status(400).json({ error: 'Invalid contract address', detail: error.details[0].message }); return; }
  try {
    const result = await analyzeContract(value.address);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(502).json({ error: 'Analysis failed', detail: err.message });
  }
});

export default router;
