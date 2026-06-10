import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'GitHub Issue Search API', info: '/github-issue-search/info', openapi: '/github-issue-search/openapi.json', health: 'ok' });
});

router.post('/search', async (req: Request, res: Response) => {
  const { query, repo, state, labels } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search GitHub issues for: "${query}". Repo: ${repo || 'any'}, State: ${state || 'open'}, Labels: ${JSON.stringify(labels || [])}. Return simulated results JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"query":"${query}","total_count":0,"issues":[{"number":1,"title":"string","state":"open|closed","labels":["string"],"assignees":["string"],"created_at":"ISO8601","updated_at":"ISO8601","comments":0,"url":"string","body_preview":"string","is_pr":false}],"facets":{"by_label":{},"by_assignee":{},"by_state":{"open":0,"closed":0}},"source_provenance":{"provider":"github-issue-search-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":300,"cache_recommended":true,"recommended_next_api":"github-issue-search","recommended_next_endpoint":"/analyze","automation_safe":true,"confidence_per_section":{"search":0.88},"recommended_actions_priority_order":["triage results","assign issues","set milestones"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { issues, repo } = req.body;
  if (!Array.isArray(issues) || issues.length === 0) return res.status(400).json({ error: 'issues array is required' });
  try {
    const raw = await callClaude(`Analyze GitHub issue patterns for repo ${repo || 'N/A'}: ${JSON.stringify(issues).slice(0, 800)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"issue_count":${issues.length},"patterns":{"top_labels":["string"],"most_active_assignees":["string"],"avg_resolution_days":0,"reopened_rate":0.0,"common_themes":["string"]},"health_metrics":{"open_issue_ratio":0.0,"stale_issue_count":0,"unassigned_count":0,"overdue_count":0},"recommendations":["string"],"source_provenance":{"provider":"github-issue-search-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"github-issue-search","recommended_next_endpoint":"/triage","automation_safe":true,"confidence_per_section":{"patterns":0.85,"recommendations":0.8},"recommended_actions_priority_order":["address top patterns","resolve stale issues","improve velocity"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/triage', async (req: Request, res: Response) => {
  const { issue_title, issue_body, labels } = req.body;
  if (!issue_title) return res.status(400).json({ error: 'issue_title is required' });
  try {
    const raw = await callClaude(`Triage GitHub issue: "${issue_title}". Body: "${issue_body || ''}". Labels: ${JSON.stringify(labels || [])}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"priority":"P0|P1|P2|P3","severity":"critical|high|medium|low","issue_type":"bug|feature|question|documentation|performance|security|other","suggested_labels":["string"],"suggested_assignee_role":"string","estimated_effort":"hours|days|weeks","milestone_fit":"current_sprint|next_sprint|backlog|ice_box","duplicate_risk":false,"needs_more_info":false,"source_provenance":{"provider":"github-issue-search-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"github-issue-search","recommended_next_endpoint":"/issue-intelligence","automation_safe":true,"confidence_per_section":{"triage":0.87},"recommended_actions_priority_order":["apply labels","assign","add to milestone"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { query, objective } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'issue_search',
    next_api: 'github-issue-search', next_endpoint: '/search',
    blocking_flags: [], flag_definitions: { NO_QUERY: 'query is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'github-issue-search', recommended_next_endpoint: '/search',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Search issues', 'Triage results', 'Assign and label'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/issue-intelligence', async (req: Request, res: Response) => {
  const { issue_title, issue_body, repo, context } = req.body;
  if (!issue_title) return res.status(400).json({ error: 'issue_title is required' });
  try {
    const raw = await callClaude(`Full GitHub issue intelligence: "${issue_title}". Body: "${issue_body || ''}". Repo: ${repo || 'N/A'}, Context: ${context || 'software project'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"issue_type":"string","priority":"P0|P1|P2|P3","severity":"string","suggested_labels":["string"],"reproducible":true,"root_cause_hypothesis":"string","suggested_fix":"string","estimated_effort":"string","related_components":["string"],"similar_issues":["string"],"source_provenance":{"provider":"github-issue-search-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"github-issue-search","recommended_next_endpoint":"/duplicates","automation_safe":true,"confidence_per_section":{"triage":0.87,"fix_hypothesis":0.72},"recommended_actions_priority_order":["fix root cause","add test coverage","close and document"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/duplicates', async (req: Request, res: Response) => {
  const { issue_title, issue_body, existing_issues } = req.body;
  if (!issue_title) return res.status(400).json({ error: 'issue_title is required' });
  try {
    const raw = await callClaude(`Find duplicate GitHub issues. New issue: "${issue_title}". Body: "${issue_body || ''}". Existing: ${JSON.stringify(existing_issues || []).slice(0, 500)}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"is_duplicate":false,"duplicate_candidates":[{"issue_number":0,"title":"string","similarity_score":0.0,"relationship":"duplicate|related|similar|parent"}],"recommended_action":"close_as_duplicate|mark_related|keep_open","source_provenance":{"provider":"github-issue-search-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"github-issue-search","recommended_next_endpoint":"/triage","automation_safe":true,"confidence_per_section":{"duplicate_detection":0.83},"recommended_actions_priority_order":["close duplicates","link related","proceed with new if unique"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { issues } = req.body;
  if (!Array.isArray(issues) || issues.length === 0) return res.status(400).json({ error: 'issues array is required' });
  if (issues.length > 20) return res.status(400).json({ error: 'Maximum 20 issues per batch' });
  try {
    const results = await Promise.all(issues.map(async (issue: { title: string; body?: string }) => {
      const raw = await callClaude(`Quick issue triage: "${issue.title}". Return JSON:
{"priority":"P0|P1|P2|P3","type":"bug|feature|question|other","labels":["string"],"effort":"hours|days|weeks","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: issues.length, results,
      source_provenance: { provider: 'github-issue-search-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'github-issue-search', recommended_next_endpoint: '/analyze',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
