import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

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

function traceId() { return `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Reputation Intelligence API', info: '/reputation-intelligence/info', openapi: '/reputation-intelligence/openapi.json', health: 'ok' });
});

// POST /reputation-score
router.post('/reputation-score', async (req: Request, res: Response) => {
  const { entity, content } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const contentStr = content ? `\n\nContent for analysis:\n"${String(content).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a reputation intelligence analyst. Assess the overall reputation of the following entity based on public information, news coverage, social sentiment, and known history. Score each reputation dimension from 0-100 and generate an overall composite score.${contentStr}

Entity: "${String(entity)}"

Scoring guidelines: 80-100 = excellent (A+/A), 60-79 = good (B), 40-59 = average (C), 20-39 = poor (D), 0-19 = critical (F). Industry percentile should reflect standing relative to peers. Trend should reflect recent trajectory over the past 3-6 months.

Return JSON:
{
  "entity": "${String(entity)}",
  "entity_type": "company|person",
  "overall_score": 0,
  "grade": "A+|A|B|C|D|F",
  "dimensions": {
    "public_perception": 0,
    "media_coverage": 0,
    "executive_trust": 0,
    "social_sentiment": 0,
    "crisis_history": 0
  },
  "trend": "improving|stable|declining",
  "industry_percentile": "string (e.g. 72nd percentile among S&P 500 companies)",
  "summary": "string (2-3 sentence reputation overview)",
  "confidence_per_section": { "overall_score": 0.0, "dimensions": 0.0, "trend": 0.0, "percentile": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /crisis-detection
router.post('/crisis-detection', async (req: Request, res: Response) => {
  const { entity, content } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const contentStr = content ? `\n\nContent/signals to analyze:\n"${String(content).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a crisis communications intelligence analyst. Assess whether the following entity is currently experiencing or at risk of a reputational crisis. Analyze crisis level, type, velocity, and spread.${contentStr}

Entity: "${String(entity)}"

Determine: Is a crisis currently detected? If so, what level (emerging means early signs but not yet viral, active means ongoing and spreading, severe means full-blown with significant coverage, recovering means past peak but still active)? What type of crisis? How fast is it spreading? Which channels are affected? What is the estimated audience reach? When will it peak? How urgently should communications respond?

Return JSON:
{
  "crisis_detected": true,
  "crisis_level": "none|emerging|active|severe|recovering",
  "crisis_type": "pr|legal|financial|operational|social|regulatory",
  "velocity": "spreading|contained|fading",
  "affected_channels": ["string (e.g. Twitter/X, mainstream media, Reddit, LinkedIn)"],
  "estimated_reach": "string (e.g. 2.4M impressions, or 'insufficient data')",
  "time_to_peak_estimate": "string (e.g. 48-72 hours, or 'already peaked')",
  "recommended_response_urgency": "immediate|24h|72h|monitor",
  "confidence_per_section": { "crisis_detection": 0.0, "level_assessment": 0.0, "velocity": 0.0, "channel_analysis": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /narrative-analysis
router.post('/narrative-analysis', async (req: Request, res: Response) => {
  const { content, entity } = req.body;
  if (!content || !entity) return res.status(400).json({ error: 'content and entity are required' });
  try {
    const raw = await callClaude(`You are a narrative intelligence and media framing analyst. Analyze the following content to identify the dominant narrative being constructed around the entity, the sentiment and framing, key themes, counter-narratives, and whether media bias is detectable.

Entity: "${String(entity)}"
Content: "${String(content).slice(0, 4000)}"

Identify: What is the central narrative being told about this entity? Is the entity positioned as a hero (positive protagonist), villain (antagonist/responsible party), victim (subject of external harm), or neutral (factual coverage)? What are the key themes? Are there counter-narratives challenging the dominant story? Is the narrative gaining strength or fading? Is media bias detectable in the framing?

Return JSON:
{
  "dominant_narrative": "string (concise description of the main story being told)",
  "narrative_sentiment": "positive|neutral|negative",
  "framing": "hero|villain|victim|neutral",
  "key_themes": ["string"],
  "counter_narratives": ["string (alternative framings or pushback narratives)"],
  "narrative_momentum": "gaining|stable|losing",
  "media_bias_detected": "string (description of detected bias or 'none detected')",
  "confidence_per_section": { "narrative_identification": 0.0, "sentiment": 0.0, "framing": 0.0, "theme_extraction": 0.0, "bias_detection": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /brand-risk
router.post('/brand-risk', async (req: Request, res: Response) => {
  const { entity, content } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const contentStr = content ? `\n\nContent/context:\n"${String(content).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a brand risk intelligence analyst. Assess the brand risk exposure for the following entity. Score brand risk from 0-100 (0 = no risk, 100 = existential threat), identify specific risk vectors, and assess boycott and viral risk.${contentStr}

Entity: "${String(entity)}"

Identify all brand risk vectors: media exposure risks, social media amplification risks, legal risks that could damage brand, regulatory risks, and competitive reputation threats. For each vector, assess category, severity, and likelihood. Estimate potential revenue impact range. A score of 70+ is critical, 50-69 is high, 30-49 is medium, below 30 is low.

Return JSON:
{
  "brand_risk_score": 0,
  "risk_level": "critical|high|medium|low",
  "risk_vectors": [
    {
      "risk": "string (description of the specific risk)",
      "category": "media|social|legal|regulatory|competitive",
      "severity": "critical|high|medium|low",
      "likelihood": "high|medium|low"
    }
  ],
  "boycott_risk": "high|medium|low|none",
  "viral_risk": "high|medium|low",
  "revenue_impact_estimate": "string (e.g. 3-8% revenue headwind if materialized, or 'minimal')",
  "confidence_per_section": { "risk_scoring": 0.0, "vector_identification": 0.0, "boycott_viral": 0.0, "revenue_impact": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /executive-analysis
router.post('/executive-analysis', async (req: Request, res: Response) => {
  const { executive_name, company } = req.body;
  if (!executive_name) return res.status(400).json({ error: 'executive_name is required' });
  try {
    const raw = await callClaude(`You are an executive reputation intelligence analyst. Assess the public reputation, leadership perception, and media standing of the following executive. Identify controversies, leadership signals, and social presence trends.

Executive: "${String(executive_name)}"
Company: "${String(company || 'not specified')}"

Assess: Overall reputation score (0-100), public perception sentiment, known controversies or PR incidents, leadership signal (inspiring = visionary and well-regarded, competent = solid but unremarkable, neutral = limited public profile, concerning = negative public sentiment or controversies), media sentiment direction, and whether their social media following is growing, stable, or declining.

Return JSON:
{
  "executive": "${String(executive_name)}",
  "company": "${String(company || 'not specified')}",
  "reputation_score": 0,
  "public_perception": "positive|neutral|negative",
  "controversies": ["string (brief description of each known controversy or 'none identified')"],
  "leadership_signals": "inspiring|competent|neutral|concerning",
  "media_sentiment": "string (e.g. Predominantly positive with focus on innovation leadership)",
  "social_following_trend": "growing|stable|declining",
  "confidence_per_section": { "reputation_scoring": 0.0, "controversy_identification": 0.0, "leadership_assessment": 0.0, "media_analysis": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /controversy-tracking
router.post('/controversy-tracking', async (req: Request, res: Response) => {
  const { entity, content } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const contentStr = content ? `\n\nContent/signals:\n"${String(content).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a reputational controversy tracking analyst. Identify, catalog, and assess all known controversies associated with the following entity. Determine recurrence risk based on the pattern of controversies.${contentStr}

Entity: "${String(entity)}"

For each controversy: identify the topic, severity (critical = criminal/regulatory/existential, major = significant PR damage, minor = manageable), current status (active = ongoing, resolved = concluded, emerging = just beginning), approximate first seen and last active dates, and resolution status. Identify the most serious controversy and assess the risk that controversies will recur.

Return JSON:
{
  "controversies": [
    {
      "topic": "string (e.g. Data privacy lawsuit, CEO misconduct allegations)",
      "severity": "critical|major|minor",
      "status": "active|resolved|emerging",
      "first_seen": "string (approximate date or year)",
      "last_active": "string (approximate date or 'ongoing')",
      "resolution_status": "string (e.g. Settled out of court, Under investigation, Resolved with apology)"
    }
  ],
  "controversy_count": 0,
  "most_serious": "string (description of the most serious controversy)",
  "recurrence_risk": "string (e.g. High — pattern of recurring data handling issues suggests systemic risk)",
  "confidence_per_section": { "controversy_identification": 0.0, "severity_assessment": 0.0, "recurrence_analysis": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { entity } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const entityStr = String(entity);
    const blocking_flags: string[] = [];

    if (entityStr.trim().length < 2) blocking_flags.push('entity_name_too_short');
    if (entityStr.length > 500) blocking_flags.push('entity_name_exceeds_maximum_length');

    // Detect entity type heuristically
    let entity_type_detected = 'company';
    const wordCount = entityStr.trim().split(/\s+/).length;
    // People typically have 2-4 words; very long names or single words with Inc/Corp suggest company
    if (wordCount >= 2 && wordCount <= 4 && !entityStr.match(/\b(inc|corp|llc|ltd|group|holdings|co\.|company|technologies|solutions|services|systems|capital|partners|ventures|fund|bank|financial)\b/i)) {
      entity_type_detected = 'person';
    }

    // Recommend endpoint
    let recommended_endpoint = '/reputation-intelligence/reputation-score';
    if (entity_type_detected === 'person') recommended_endpoint = '/reputation-intelligence/executive-analysis';

    res.json({
      execution_ready: blocking_flags.length === 0,
      entity_type_detected,
      recommended_endpoint,
      blocking_flags,
      trace_id: traceId(),
      confidence_per_section: { entity_detection: 0.8, readiness: blocking_flags.length === 0 ? 1.0 : 0.0 },
      privacy: { data_stored: false, retention: 'none' },
      computed_at: new Date().toISOString()
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /monitor (ONE-CALL full reputation monitoring)
router.post('/monitor', async (req: Request, res: Response) => {
  const { entity, content } = req.body;
  if (!entity) return res.status(400).json({ error: 'entity is required' });
  try {
    const contentStr = content ? `\n\nContent/signals:\n"${String(content).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a chief reputation intelligence officer. Perform a comprehensive one-call reputation monitoring analysis for the following entity. Cover all critical dimensions: reputation score, crisis status, dominant narrative, brand risk, top controversies, executive signals, and recommended actions.${contentStr}

Entity: "${String(entity)}"

Provide an integrated, holistic assessment that connects all reputation dimensions. The one_line_summary should be a crisp, executive-level statement suitable for a C-suite dashboard. recommended_actions should be concrete and prioritized. top_controversies should list only the most material ones (max 3).

Return JSON:
{
  "reputation_score": 0,
  "crisis_level": "none|emerging|active|severe|recovering",
  "dominant_narrative": "string (the main story being told about this entity right now)",
  "brand_risk_score": 0,
  "top_controversies": ["string"],
  "executive_signals": "string (summary of executive reputation and leadership signals)",
  "recommended_actions": ["string (prioritized, concrete actions)"],
  "one_line_summary": "string (single executive-level sentence)",
  "confidence_per_section": { "reputation_score": 0.0, "crisis_assessment": 0.0, "narrative": 0.0, "brand_risk": 0.0, "controversies": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Governance + Workflow
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['reputation:read', 'reputation:analyze', 'reputation:monitor'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const violations: string[] = trust_score < 0.3 ? ['trust_score_below_threshold'] : [];
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode: trust_score < 0.5, violations, scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, execution_id: req.params.execution_id, events: eventStore[req.params.execution_id] || [], total: (eventStore[req.params.execution_id] || []).length, computed_at: new Date().toISOString() });
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked' }), success: gov.permitted, ...gov, required_scopes: REQUIRED_SCOPES, computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, audit_trail: execution_id ? (eventStore[execution_id] || []) : [], agent_id: gov.agent_id, trust_score: gov.trust_score, computed_at: new Date().toISOString() });
});
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps } = req.body || {};
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultSteps = ['collect_signals', 'score_reputation', 'detect_crisis', 'analyze_narrative', 'generate_insights'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
  const wf = workflowStore[id];
  res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; }
  wf.updated_at = new Date().toISOString();
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() });
});

export default router;
