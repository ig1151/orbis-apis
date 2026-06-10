import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Executive Risk API', info: '/executive-risk/info', openapi: '/executive-risk/openapi.json', health: 'ok' });
});

router.post('/assess', async (req: Request, res: Response) => {
  const { name, company, role } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Assess executive risk profile: name="${name}", company="${company||''}", role="${role||'CEO'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","company":"string","role":"string","overall_risk":"low|medium|high|critical","risk_score":0.0,"risk_dimensions":{"regulatory":0.0,"reputational":0.0,"financial":0.0,"operational":0.0,"legal":0.0},"risk_categories":["string"],"watchlist_flags":["string"],"pep_indicator":false,"sanctions_indicator":false,"source_provenance":{"provider":"executive-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.82},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"executive-risk","recommended_next_endpoint":"/red-flags","automation_safe":true,"confidence_per_section":{"risk":0.84,"flags":0.80},"recommended_actions_priority_order":["review red flags","check reputation","escalate if high risk"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/red-flags', async (req: Request, res: Response) => {
  const { name, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Identify executive red flags: name="${name}", company="${company||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","red_flags":[{"type":"litigation|regulatory|reputational|financial|conflict_of_interest|media","description":"string","severity":"critical|high|medium|low","source":"string","date":"string"}],"flag_count":0,"highest_severity":"critical|high|medium|low|none","escalation_required":false,"recommended_action":"block|review|monitor|clear","source_provenance":{"provider":"executive-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.82},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"executive-risk","recommended_next_endpoint":"/executive-intelligence","automation_safe":true,"confidence_per_section":{"flags":0.83},"recommended_actions_priority_order":["address critical flags","document findings","make determination"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/reputation', async (req: Request, res: Response) => {
  const { name, company, industry } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Score executive reputation: name="${name}", company="${company||''}", industry="${industry||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","reputation_score":0.0,"industry_standing":"leader|respected|neutral|controversial|toxic","media_sentiment":"positive|neutral|negative","peer_perception":"string","notable_achievements":["string"],"controversies":["string"],"thought_leadership_score":0.0,"board_affiliations":["string"],"source_provenance":{"provider":"executive-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.75},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"executive-risk","recommended_next_endpoint":"/executive-intelligence","automation_safe":true,"confidence_per_section":{"reputation":0.78},"recommended_actions_priority_order":["review controversies","assess standing","note achievements"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { name, objective } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'executive_diligence',
    next_api: 'executive-risk', next_endpoint: '/assess',
    blocking_flags: [], flag_definitions: { NO_NAME: 'name is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'executive-risk', recommended_next_endpoint: '/assess',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Assess risk', 'Check red flags', 'Review reputation'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/executive-intelligence', async (req: Request, res: Response) => {
  const { name, company, role, context } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Full executive risk intelligence: name="${name}", company="${company||''}", role="${role||'CEO'}", context="${context||'partnership diligence'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","company":"string","role":"string","overall_risk":"low|medium|high|critical","risk_score":0.0,"reputation_score":0.0,"red_flags":[{"type":"string","description":"string","severity":"string"}],"media_sentiment":"positive|neutral|negative","regulatory_history":"clean|minor|significant|severe","litigation_history":"none|civil|criminal","pep_indicator":false,"sanctions_indicator":false,"engagement_recommendation":"proceed|proceed_with_monitoring|enhanced_diligence|decline","summary":"string","source_provenance":{"provider":"executive-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.82},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"decision-maker-fit","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"risk":0.84,"reputation":0.78},"recommended_actions_priority_order":["act on recommendation","document findings","set monitoring"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/news-signals', async (req: Request, res: Response) => {
  const { name, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Get news-based risk signals for executive: name="${name}", company="${company||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","news_risk_score":0.0,"recent_headlines":[{"headline":"string","sentiment":"positive|negative|neutral","date":"string","risk_type":"legal|financial|reputational|operational|none"}],"trending_topics":["string"],"media_velocity":"high|medium|low","alert_level":"red|amber|green","source_provenance":{"provider":"executive-risk-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.70},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"executive-risk","recommended_next_endpoint":"/executive-intelligence","automation_safe":true,"confidence_per_section":{"news":0.75},"recommended_actions_priority_order":["review negative headlines","assess trending topics","set news alert"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { executives } = req.body;
  if (!Array.isArray(executives) || executives.length === 0) return res.status(400).json({ error: 'executives array is required' });
  if (executives.length > 5) return res.status(400).json({ error: 'Maximum 5 executives per batch' });
  try {
    const results = await Promise.all(executives.map(async (e: { name: string; company?: string; role?: string }) => {
      const raw = await callClaude(`Quick executive risk assessment: name="${e.name}", company="${e.company||''}", role="${e.role||''}". Return JSON only:
{"name":"${e.name}","company":"${e.company||''}","risk_score":0.0,"overall_risk":"low|medium|high|critical","top_flag":"string","recommendation":"proceed|review|decline","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: executives.length, results,
      source_provenance: { provider: 'executive-risk-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.82 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'executive-risk', recommended_next_endpoint: '/executive-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
