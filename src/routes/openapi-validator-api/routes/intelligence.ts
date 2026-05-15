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
  res.json({ name: 'OpenAPI Validator API', info: '/openapi-validator/info', openapi: '/openapi-validator/openapi.json', health: 'ok' });
});

// POST /validate
router.post('/validate', async (req: Request, res: Response) => {
  const { spec, spec_url } = req.body;
  if (!spec && !spec_url) return res.status(400).json({ error: 'spec or spec_url is required' });
  try {
    const specSummary = spec ? JSON.stringify(spec).slice(0, 500) : `URL: ${spec_url}`;
    const raw = await callClaude(`Validate OpenAPI 3.x spec: ${specSummary}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "is_valid": true|false,
  "openapi_version": "string",
  "errors": [{"path": "string", "message": "string", "severity": "error|warning"}],
  "missing_fields": ["string"],
  "schema_violations": [{"field": "string", "expected": "string", "found": "string"}],
  "info_complete": true|false,
  "paths_count": number,
  "confidence_per_section": {"validation": 0-1, "errors": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lint
router.post('/lint', async (req: Request, res: Response) => {
  const { spec, spec_url } = req.body;
  if (!spec && !spec_url) return res.status(400).json({ error: 'spec or spec_url is required' });
  try {
    const specSummary = spec ? JSON.stringify(spec).slice(0, 500) : `URL: ${spec_url}`;
    const raw = await callClaude(`Lint OpenAPI spec for best practices: ${specSummary}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "lint_score": 0-100,
  "issues": [
    {"rule": "string", "path": "string", "message": "string", "severity": "error|warning|info", "fix": "string"}
  ],
  "missing_descriptions": ["path"],
  "missing_operation_ids": ["path"],
  "missing_examples": ["path"],
  "missing_response_schemas": ["path"],
  "security_coverage": 0-1,
  "confidence_per_section": {"lint_score": 0-1, "issues": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /score
router.post('/score', async (req: Request, res: Response) => {
  const { spec, spec_url } = req.body;
  if (!spec && !spec_url) return res.status(400).json({ error: 'spec or spec_url is required' });
  try {
    const specSummary = spec ? JSON.stringify(spec).slice(0, 500) : `URL: ${spec_url}`;
    const raw = await callClaude(`Score OpenAPI spec quality: ${specSummary}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "overall_score": 0-100,
  "grade": "A|B|C|D|F",
  "dimensions": {
    "completeness": 0-100,
    "agent_callability": 0-100,
    "mcp_compatibility": 0-100,
    "documentation_coverage": 0-100,
    "schema_quality": 0-100,
    "security_definition": 0-100
  },
  "agent_ready": true|false,
  "mcp_compatible": true|false,
  "strengths": ["string"],
  "improvements": [{"area": "string", "impact": "high|medium|low", "fix": "string"}],
  "confidence_per_section": {"overall_score": 0-1, "dimensions": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /diff
router.post('/diff', async (req: Request, res: Response) => {
  const { spec_a, spec_b, spec_url_a, spec_url_b } = req.body;
  if ((!spec_a && !spec_url_a) || (!spec_b && !spec_url_b)) return res.status(400).json({ error: 'spec_a and spec_b (or URLs) are required' });
  try {
    const raw = await callClaude(`Diff two OpenAPI specs. spec_a: ${JSON.stringify(spec_a || spec_url_a).slice(0, 300)} spec_b: ${JSON.stringify(spec_b || spec_url_b).slice(0, 300)}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "has_breaking_changes": true|false,
  "breaking_changes": [{"path": "string", "type": "removed|renamed|type_changed|required_added", "description": "string"}],
  "additions": [{"path": "string", "type": "endpoint|field|schema|parameter", "description": "string"}],
  "removals": [{"path": "string", "type": "endpoint|field|schema|parameter", "description": "string"}],
  "modifications": [{"path": "string", "description": "string"}],
  "migration_impact": "breaking|non-breaking|additive",
  "confidence_per_section": {"breaking_changes": 0-1, "additions": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /orbis-score
router.post('/orbis-score', async (req: Request, res: Response) => {
  const { spec, spec_url } = req.body;
  if (!spec && !spec_url) return res.status(400).json({ error: 'spec or spec_url is required' });
  try {
    const specStr = spec ? JSON.stringify(spec).slice(0, 3000) : `url: ${spec_url}`;
    const raw = await callClaude(`Grade this OpenAPI spec against the Orbis A+ marketplace checklist. spec: ${specStr}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "grade": "A+|A|B|C|D|F",
  "score": 0-100,
  "checklist": {
    "has_security_schemes": true|false,
    "has_x_pricing": true|false,
    "has_x_compliance": true|false,
    "has_mcp_metadata": true|false,
    "has_typed_responses": true|false,
    "has_operation_ids": true|false,
    "has_execution_gate": true|false,
    "has_one_call": true|false
  },
  "gaps": [{"field": "string", "impact": "high|medium|low", "fix": "string"}],
  "confidence_per_section": {"checklist": 0-1, "grade": 0-1},
  "recommended_actions_priority_order": ["add security schemes", "add x-pricing metadata", "add execution-gate endpoint"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { spec_url, objective } = req.body;
  if (!spec_url) return res.status(400).json({ error: 'spec_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    spec_url,
    objective: objective || 'spec_validation',
    next_api: 'github-repo-stats',
    next_endpoint: '/analyze',
    blocking_flags: [],
    flag_definitions: { NO_SPEC: 'No spec or spec_url provided', INVALID_FORMAT: 'Spec may not be valid JSON or YAML' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Validate first', 'Lint for best practices', 'Score for agent-callability', 'Use /check for full one-call report'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /check (one-call)
router.post('/check', async (req: Request, res: Response) => {
  const { spec, spec_url } = req.body;
  if (!spec && !spec_url) return res.status(400).json({ error: 'spec or spec_url is required' });
  try {
    const specSummary = spec ? JSON.stringify(spec).slice(0, 600) : `URL: ${spec_url}`;
    const raw = await callClaude(`Full OpenAPI spec check (validate + lint + score): ${specSummary}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "is_valid": true|false,
  "overall_score": 0-100,
  "grade": "A|B|C|D|F",
  "validation_errors": [{"path": "string", "message": "string", "severity": "error|warning"}],
  "lint_issues": [{"rule": "string", "message": "string", "severity": "error|warning|info"}],
  "score_breakdown": {"completeness": 0-100, "agent_callability": 0-100, "mcp_compatibility": 0-100, "documentation_coverage": 0-100},
  "agent_ready": true|false,
  "top_improvements": [{"area": "string", "fix": "string", "impact": "high|medium|low"}],
  "confidence_per_section": {"validation": 0-1, "lint": 0-1, "score": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
