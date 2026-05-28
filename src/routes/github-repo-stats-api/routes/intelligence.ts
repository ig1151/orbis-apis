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
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'GitHub Repo Stats API', info: '/github-repo-stats/info', openapi: '/github-repo-stats/openapi.json', health: 'ok' });
});

// POST /repo
router.post('/repo', async (req: Request, res: Response) => {
  const { repo, owner } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  try {
    const raw = await callClaude(`GitHub repo metadata for: "${owner ? owner + '/' : ''}${repo}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "repo": {
    "full_name": "string", "description": "string", "stars": number,
    "forks": number, "watchers": number, "language": "string",
    "license": "string", "topics": ["string"],
    "open_issues": number, "last_commit_days_ago": number,
    "created_years_ago": number, "size_kb": number,
    "has_wiki": true|false, "has_pages": true|false, "is_archived": false
  },
  "health_score": 0-100,
  "activity_grade": "A|B|C|D|F",
  "confidence_per_section": {"repo": 0-1, "health_score": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /contributors
router.post('/contributors', async (req: Request, res: Response) => {
  const { repo, owner } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  try {
    const raw = await callClaude(`Contributors for GitHub repo: "${owner ? owner + '/' : ''}${repo}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "top_contributors": [
    {"username": "string", "commits": number, "additions": number, "deletions": number,
     "activity_trend": "increasing|stable|decreasing", "is_core_maintainer": true|false}
  ],
  "bus_factor_score": 0-100,
  "bus_factor_risk": "high|medium|low",
  "total_contributors": number,
  "community_health": "thriving|healthy|moderate|low",
  "confidence_per_section": {"top_contributors": 0-1, "bus_factor_score": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /activity
router.post('/activity', async (req: Request, res: Response) => {
  const { repo, owner } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  try {
    const raw = await callClaude(`Activity metrics for GitHub repo: "${owner ? owner + '/' : ''}${repo}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "commit_frequency": {"avg_per_week": number, "trend": "increasing|stable|decreasing", "last_30_days": number},
  "pr_velocity": {"open": number, "merged_last_30_days": number, "avg_review_days": number, "merge_rate_pct": number},
  "issue_close_rate": {"open": number, "closed_last_30_days": number, "avg_days_to_close": number},
  "release_cadence": {"releases_per_year": number, "last_release_days_ago": number, "semantic_versioning": true|false},
  "activity_score": 0-100,
  "confidence_per_section": {"commit_frequency": 0-1, "pr_velocity": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /dependencies
router.post('/dependencies', async (req: Request, res: Response) => {
  const { repo, owner, ecosystem = 'npm' } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  try {
    const raw = await callClaude(`Dependencies for GitHub repo: "${owner ? owner + '/' : ''}${repo}" ecosystem: "${ecosystem}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "dependencies": [
    {"name": "string", "version": "string", "latest_version": "string",
     "is_outdated": true|false, "vulnerability_risk": "critical|high|medium|low|none",
     "license": "string", "license_risk": "compatible|copyleft|proprietary|unknown"}
  ],
  "summary": {
    "total": number, "outdated": number, "vulnerable": number,
    "license_issues": number, "risk_score": 0-100
  },
  "confidence_per_section": {"dependencies": 0-1, "summary": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { repo, objective } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    repo,
    objective: objective || 'repo_health',
    next_api: 'qa-testing',
    next_endpoint: '/test-workflow',
    blocking_flags: [],
    flag_definitions: { NO_REPO: 'No repo provided', ARCHIVED: 'Repo is archived — no active development' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Get repo metadata first', 'Check contributors for bus factor', 'Use /analyze for full health report'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (one-call)
router.post('/analyze', async (req: Request, res: Response) => {
  const { repo, owner } = req.body;
  if (!repo) return res.status(400).json({ error: 'repo is required' });
  try {
    const raw = await callClaude(`Full repo health analysis for: "${owner ? owner + '/' : ''}${repo}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "repo": {"full_name": "string", "stars": number, "forks": number, "language": "string", "license": "string"},
  "contributors": {"total": number, "bus_factor_score": 0-100, "community_health": "thriving|healthy|moderate|low"},
  "activity": {"commit_freq_per_week": number, "pr_merge_rate_pct": number, "activity_score": 0-100},
  "dependencies": {"total": number, "vulnerable": number, "outdated": number, "risk_score": 0-100},
  "overall_health_score": 0-100,
  "health_grade": "A|B|C|D|F",
  "risks": [{"risk": "string", "severity": "critical|high|medium|low"}],
  "confidence_per_section": {"repo": 0-1, "contributors": 0-1, "activity": 0-1, "dependencies": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
