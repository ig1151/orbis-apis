import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getStrategySignal } from '../services/strategy';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { MetaScanResult, SymbolResult } from '../types';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();

const VALID_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'OP', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'DOGE', 'SUI', 'APT', 'SEI', 'INJ', 'TIA',
  'ATOM', 'DOT', 'NEAR', 'FET',
];

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'SUI'];

const PREDICTION_QUERIES: Record<string, string> = {
  BTC: 'bitcoin price',
  ETH: 'ethereum price',
  SOL: 'solana price',
  ARB: 'arbitrum crypto',
  SUI: 'sui crypto price',
  BNB: 'binance coin crypto',
  OP: 'optimism crypto',
  AVAX: 'avalanche crypto',
  MATIC: 'polygon crypto',
  LINK: 'chainlink crypto',
  UNI: 'uniswap crypto',
  DOGE: 'dogecoin price',
  APT: 'aptos crypto',
  SEI: 'sei network crypto',
  INJ: 'injective crypto',
  TIA: 'celestia crypto',
  ATOM: 'cosmos crypto',
  DOT: 'polkadot crypto',
  NEAR: 'near protocol crypto',
  FET: 'fetch ai crypto',
};

const schema = Joi.object({
  symbols: Joi.string().optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbolsParam = req.query.symbols as string | undefined;
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter((s) => VALID_SYMBOLS.includes(s)).slice(0, 5)
    : DEFAULT_SYMBOLS;

  if (requestedSymbols.length === 0) {
    res.status(400).json({ error: 'No valid symbols provided', validSymbols: VALID_SYMBOLS });
    return;
  }

  try {
    logger.info({ symbols: requestedSymbols }, 'meta scan started');

    const results = await Promise.allSettled(
      requestedSymbols.map((symbol) =>
        getStrategySignal(symbol, PREDICTION_QUERIES[symbol] || symbol.toLowerCase() + ' crypto')
      )
    );

    const symbolResults: SymbolResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' || !result.value) continue;

      const data = result.value;
      symbolResults.push({
        symbol: data.symbol,
        decision: data.decision,
        signalScore: data.signalScore,
        confidence: data.confidence,
        riskLevel: data.riskLevel,
        invalidatedIf: data.invalidatedIf,
        action: data.action,
        reasoning: data.reasoning,
        keyFactors: data.keyFactors || [],
        price: data.signals?.price?.price || null,
        changePercent24h: data.signals?.price?.changePercent24h || null,
        rank: 0,
      });
    }

    if (symbolResults.length === 0) {
      res.status(503).json({ error: 'All strategy API calls failed' });
      return;
    }

    // Rank by absolute signal strength
    symbolResults.sort((a, b) => Math.abs(b.signalScore) - Math.abs(a.signalScore));
    symbolResults.forEach((r, i) => { r.rank = i + 1; });

    const buySignals = symbolResults.filter((r) => r.decision === 'BUY' || r.decision === 'STRONG_BUY');
    const sellSignals = symbolResults.filter((r) => r.decision === 'SELL' || r.decision === 'STRONG_SELL');
    const holdSignals = symbolResults.filter((r) => r.decision === 'HOLD');

    const bestBuy = [...buySignals].sort((a, b) => b.signalScore - a.signalScore)[0] || null;
    const bestSell = [...sellSignals].sort((a, b) => a.signalScore - b.signalScore)[0] || null;
    const topOpportunity = bestBuy || bestSell || symbolResults[0] || null;

    const avgScore = symbolResults.reduce((s, r) => s + r.signalScore, 0) / symbolResults.length;
    const marketBias: MetaScanResult['marketBias'] =
      avgScore >= 30 ? 'RISK_ON' :
      avgScore <= -30 ? 'RISK_OFF' :
      buySignals.length > 0 && sellSignals.length > 0 ? 'MIXED' : 'NEUTRAL';

    const scanSummary = symbolResults.map((r) =>
      `${r.symbol}: ${r.decision} (score ${r.signalScore}, confidence ${r.confidence}, ${r.riskLevel} risk, price ${r.price ? '$' + r.price.toLocaleString() : 'N/A'}) — ${r.keyFactors[0] || 'neutral'}`
    ).join('\n');

    const aiPrompt = `You are a portfolio strategist reviewing multi-symbol crypto signals.

Scan results:
${scanSummary}

Market bias: ${marketBias}
Best buy: ${bestBuy ? `${bestBuy.symbol} (score ${bestBuy.signalScore})` : 'none'}
Best sell: ${bestSell ? `${bestSell.symbol} (score ${bestSell.signalScore})` : 'none'}

Write 3 sentences: (1) overall market environment, (2) most compelling opportunity and why, (3) key risk to watch. Be specific and direct.`;

    const portfolioNarrative = await callAI(aiPrompt);

    const result: MetaScanResult = {
      scannedSymbols: requestedSymbols,
      scannedCount: requestedSymbols.length,
      successCount: symbolResults.length,
      topOpportunity,
      ranked: symbolResults,
      buySignals,
      sellSignals,
      holdSignals,
      marketBias,
      portfolioNarrative,
      bestBuy,
      bestSell,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({
      symbols: requestedSymbols,
      successCount: symbolResults.length,
      marketBias,
      buyCount: buySignals.length,
      sellCount: sellSignals.length,
    }, 'meta scan complete');

    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'meta scan error');
    res.status(500).json({ error: 'Failed to run meta strategy scan', details: err.message });
  }
});


router.post('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbolsParam = req.body.symbols as string | undefined;
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter((s) => VALID_SYMBOLS.includes(s)).slice(0, 5)
    : DEFAULT_SYMBOLS;
  if (requestedSymbols.length === 0) { res.status(400).json({ error: 'No valid symbols provided', validSymbols: VALID_SYMBOLS }); return; }
  try {
    const results = await Promise.allSettled(requestedSymbols.map((symbol) => getStrategySignal(symbol, PREDICTION_QUERIES[symbol] || symbol.toLowerCase() + ' crypto')));
    const symbolResults: SymbolResult[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' || !result.value) continue;
      const data = result.value;
      symbolResults.push({ symbol: data.symbol, decision: data.decision, signalScore: data.signalScore, confidence: data.confidence, riskLevel: data.riskLevel, invalidatedIf: data.invalidatedIf, action: data.action, reasoning: data.reasoning, keyFactors: data.keyFactors || [], price: data.signals?.price?.price || null, changePercent24h: data.signals?.price?.changePercent24h || null, rank: 0 });
    }
    if (symbolResults.length === 0) { res.status(503).json({ error: 'All strategy API calls failed' }); return; }
    symbolResults.sort((a, b) => Math.abs(b.signalScore) - Math.abs(a.signalScore));
    symbolResults.forEach((r, i) => { r.rank = i + 1; });
    res.json({ success: true, data: { scannedSymbols: requestedSymbols, ranked: symbolResults, analyzedAt: new Date().toISOString() } });
  } catch (err: any) { res.status(500).json({ error: 'Failed to run meta strategy scan', details: err.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"], meta || {});
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