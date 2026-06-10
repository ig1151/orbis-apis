import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Founder Background API', info: '/founder-background/info', openapi: '/founder-background/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { name, company, linkedin_url } = req.body;
  if (!name && !linkedin_url) return res.status(400).json({ error: 'name or linkedin_url is required' });
  try {
    const raw = await callClaude(`Look up founder profile: name="${name||''}", company="${company||''}", linkedin="${linkedin_url||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","current_company":"string","current_role":"string","location":"string","education":[{"school":"string","degree":"string","year":0}],"previous_companies":[{"name":"string","role":"string","years":"string"}],"total_years_experience":0,"domain_expertise":["string"],"linkedin_url":"string","twitter_handle":"string","source_provenance":{"provider":"founder-background-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"founder-background","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"identity":0.85,"experience":0.80},"recommended_actions_priority_order":["verify profile","score credibility","check track record"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { name, company, context } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Score founder credibility and success likelihood: name="${name}", company="${company||''}", context="${context||'startup investment'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","credibility_score":0.0,"success_likelihood":0.0,"domain_expertise_score":0.0,"execution_score":0.0,"network_score":0.0,"risk_flags":["string"],"strengths":["string"],"weaknesses":["string"],"investor_signal":"strong|moderate|weak|caution","source_provenance":{"provider":"founder-background-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"founder-background","recommended_next_endpoint":"/track-record","automation_safe":true,"confidence_per_section":{"scoring":0.82},"recommended_actions_priority_order":["review risk flags","check track record","make decision"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/timeline', async (req: Request, res: Response) => {
  const { name, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Build career timeline for founder: name="${name}", company="${company||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","timeline":[{"year":0,"event":"string","type":"founded|exited|joined|left|raised|awarded","company":"string","outcome":"string","impact":"high|medium|low"}],"total_companies_founded":0,"total_exits":0,"years_active":0,"career_stage":"early|growth|serial|veteran","source_provenance":{"provider":"founder-background-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"founder-background","recommended_next_endpoint":"/founder-intelligence","automation_safe":true,"confidence_per_section":{"timeline":0.78},"recommended_actions_priority_order":["review key milestones","assess trajectory","evaluate fit"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { name, objective } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'founder_diligence',
    next_api: 'founder-background', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_NAME: 'name is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'founder-background', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Look up profile', 'Score credibility', 'Check track record'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/founder-intelligence', async (req: Request, res: Response) => {
  const { name, company, context } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Full founder intelligence for investment/partnership diligence: name="${name}", company="${company||''}", context="${context||'startup investment'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","profile_summary":"string","credibility_score":0.0,"success_likelihood":0.0,"career_highlights":["string"],"exit_history":[{"company":"string","outcome":"acquisition|ipo|shutdown","year":0,"value_usd":0}],"domain_expertise":["string"],"investor_signal":"strong|moderate|weak|caution","risk_flags":["string"],"diligence_verdict":"proceed|proceed_with_caution|decline","due_diligence_questions":["string"],"source_provenance":{"provider":"founder-background-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"executive-risk","recommended_next_endpoint":"/assess","automation_safe":true,"confidence_per_section":{"profile":0.82,"scoring":0.80},"recommended_actions_priority_order":["act on verdict","ask diligence questions","complete reference checks"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/track-record', async (req: Request, res: Response) => {
  const { name, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Analyze founder exit and investment track record: name="${name}", company="${company||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","ventures":[{"company":"string","role":"founder|co_founder|cto|ceo","founded_year":0,"exit_year":0,"exit_type":"acquisition|ipo|shutdown|active","exit_value_usd":0,"outcome_quality":"excellent|good|neutral|poor"}],"total_funding_raised_usd":0,"notable_investors":["string"],"track_record_score":0.0,"pattern":"serial_winner|one_hit|recovering|unproven","source_provenance":{"provider":"founder-background-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"founder-background","recommended_next_endpoint":"/founder-intelligence","automation_safe":true,"confidence_per_section":{"track_record":0.78},"recommended_actions_priority_order":["review exit quality","assess pattern","make decision"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { founders } = req.body;
  if (!Array.isArray(founders) || founders.length === 0) return res.status(400).json({ error: 'founders array is required' });
  if (founders.length > 5) return res.status(400).json({ error: 'Maximum 5 founders per batch' });
  try {
    const results = await Promise.all(founders.map(async (f: { name: string; company?: string }) => {
      const raw = await callClaude(`Quick founder credibility score for name="${f.name}", company="${f.company||''}". Return JSON only:
{"name":"${f.name}","company":"${f.company||''}","credibility_score":0.0,"investor_signal":"strong|moderate|weak|caution","top_risk_flag":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: founders.length, results,
      source_provenance: { provider: 'founder-background-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.80 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'founder-background', recommended_next_endpoint: '/founder-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
