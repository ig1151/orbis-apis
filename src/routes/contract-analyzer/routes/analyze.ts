import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { analyzeContract } from '../services/analyzerService';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.012;
  return {
    trace_id, execution_id, session_id, request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || { total_ms: 0, inference_ms: 0, io_ms: 0, overhead_ms: 0 },
    cost_breakdown:    overrides.cost_breakdown    || {
      total_usd:     unit,
      inference_usd: Math.round(unit * 0.70 * 1e6) / 1e6,
      io_usd:        Math.round(unit * 0.15 * 1e6) / 1e6,
      overhead_usd:  Math.round(unit * 0.15 * 1e6) / 1e6,
    },
    provenance: overrides.provenance || {
      api_version: '1.0.0', model: 'orbis-inference-v1',
      data_sources: [], computed_at: new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts: 3, backoff_strategy: 'exponential',
      backoff_base_ms: 500, safe_to_retry: true, idempotency_key: request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: req.body?.parent_execution || req.headers?.['x-parent-execution'] || null,
      triggered_by:     req.body?.triggered_by     || req.headers?.['x-triggered-by']     || null,
      downstream: [], dag_id: req.body?.dag_id || req.headers?.['x-dag-id'] || null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain: true, suggested_next: [], requires_review: false,
    },
  };
}


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


// POST /execution-gate — cross-API safety gate between Alpha Signal and execution
router.post('/execution-gate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    address: ADDRESS_SCHEMA,
    intended_action: Joi.string().valid('buy', 'sell', 'stake', 'bridge', 'interact').required(),
    source: Joi.string().default('alpha_signal'),
    confidence: Joi.number().min(0).max(1).default(0.5),
    asset: Joi.string().optional(),
    signal_id: Joi.string().optional()
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const c = await fetchContractData(value.address);
    const ai = await callAI(`You are a smart contract execution gate. Given this contract and intended action, decide whether an agent should proceed. Return ONLY valid JSON, no markdown.
Contract: ${c.contractName} | Address: ${c.address} | Verified: ${c.isVerified} | Proxy: ${c.isProxy} | Recent TXs: ${c.recentTxs}
Intended Action: ${value.intended_action} | Source: ${value.source} | Signal Confidence: ${value.confidence}
Source Code: ${c.sourceCode}

Return ALL scores as decimals 0.0-1.0:
{
  "execute": true,
  "contract_risk_score": 0.0,
  "risk_level": "low|medium|high|critical",
  "blocking_flags": [],
  "warnings": [],
  "recommended_action": "proceed|delay|investigate|block",
  "confidence": 0.0,
  "reasoning": "one sentence"
}`);

    return res.json({
      ...ai,
      address: value.address,
      contract_name: c.contractName,
      verified: c.isVerified,
      intended_action: value.intended_action,
      recommended_next_api: ai.execute ? 'autopilot' : null,
      recommended_next_endpoint: ai.execute ? '/should-execute' : null,
      chain_context: {
        source_api: value.source,
        signal_id: value.signal_id || null,
        intended_action: value.intended_action,
        asset: value.asset || c.contractName,
        signal_confidence: value.confidence
      },
      timestamp: new Date().toISOString(),
      metadata: meta(start, 0.0045)
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'execution_gate_failed', message: err.message });
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


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["defi:read", "defi:simulate", "defi:execute", "defi:risk"];
const EXECUTION_AUTHORITY: string = "high";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "assess_risk", "simulate_execution", "apply_execution_gate", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
