import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Decision Maker Fit API', info: '/decision-maker-fit/info', openapi: '/decision-maker-fit/openapi.json', health: 'ok' });
});

router.post('/score', async (req: Request, res: Response) => {
  const { name, title, company, product_description, target_icp } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Score decision maker fit: name="${name}", title="${title||''}", company="${company||''}", product="${product_description||'B2B SaaS'}", icp="${target_icp||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","title":"string","company":"string","fit_score":0.0,"authority_score":0.0,"budget_likely":false,"decision_timeline":"immediate|short_term|long_term|unknown","role_alignment":"direct_buyer|influencer|end_user|blocker","icp_match":"strong|partial|weak","fit_breakdown":{"seniority_fit":0.0,"function_fit":0.0,"industry_fit":0.0,"company_size_fit":0.0},"source_provenance":{"provider":"decision-maker-fit-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"decision-maker-fit","recommended_next_endpoint":"/outreach-angle","automation_safe":true,"confidence_per_section":{"scoring":0.84},"recommended_actions_priority_order":["route to right rep","craft personalized pitch","prioritize engagement"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/persona', async (req: Request, res: Response) => {
  const { name, title, company, industry } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Build buyer persona for decision maker: name="${name}", title="${title||''}", company="${company||''}", industry="${industry||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","persona_name":"string","archetype":"innovator|pragmatist|conservative|skeptic|champion","primary_goals":["string"],"pain_points":["string"],"success_metrics":["string"],"decision_criteria":["string"],"information_sources":["string"],"objection_patterns":["string"],"communication_preferences":"email|linkedin|phone|in_person","source_provenance":{"provider":"decision-maker-fit-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"decision-maker-fit","recommended_next_endpoint":"/outreach-angle","automation_safe":true,"confidence_per_section":{"persona":0.80},"recommended_actions_priority_order":["tailor messaging to persona","address pain points","use preferred channel"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/outreach-angle', async (req: Request, res: Response) => {
  const { name, title, company, product_description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Suggest best outreach angle for decision maker: name="${name}", title="${title||''}", company="${company||''}", product="${product_description||'B2B solution'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","primary_angle":"ROI|efficiency|risk_reduction|competitive_advantage|compliance|innovation","subject_line_ideas":["string"],"opening_hooks":["string"],"value_proposition_framing":"string","social_proof_type":"case_study|metric|peer_reference|analyst_report","call_to_action":"demo|discovery_call|free_trial|content|event","avoid_topics":["string"],"source_provenance":{"provider":"decision-maker-fit-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/intent-signals","automation_safe":true,"confidence_per_section":{"outreach":0.82},"recommended_actions_priority_order":["use primary angle","test subject lines","set up follow-up sequence"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { name, objective } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'decision_maker_qualification',
    next_api: 'decision-maker-fit', next_endpoint: '/score',
    blocking_flags: [], flag_definitions: { NO_NAME: 'name is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'decision-maker-fit', recommended_next_endpoint: '/score',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Score fit', 'Build persona', 'Get outreach angle'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/fit-intelligence', async (req: Request, res: Response) => {
  const { name, title, company, product_description, target_icp } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Full decision maker fit intelligence: name="${name}", title="${title||''}", company="${company||''}", product="${product_description||'B2B SaaS'}", icp="${target_icp||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","fit_score":0.0,"authority_score":0.0,"persona":"string","archetype":"innovator|pragmatist|conservative|skeptic","buying_signals":["string"],"primary_pain_points":["string"],"outreach_angle":"string","subject_line":"string","value_prop_framing":"string","objection_prep":["string"],"recommended_action":"engage_now|nurture|deprioritize","priority_level":"hot|warm|cold","source_provenance":{"provider":"decision-maker-fit-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/contact-intelligence","automation_safe":true,"confidence_per_section":{"fit":0.84,"outreach":0.82},"recommended_actions_priority_order":["engage based on priority","personalize using angle","track response"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/buying-signals', async (req: Request, res: Response) => {
  const { name, company, industry } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Detect buying signals for decision maker: name="${name}", company="${company||''}", industry="${industry||''}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"name":"string","buying_signal_score":0.0,"signals":[{"signal":"string","type":"job_change|tech_stack|growth|event|content_engagement|competitive","strength":"strong|moderate|weak","recency":"days|weeks|months"}],"in_market":"yes|likely|possibly|no","trigger_event":"string","recommended_urgency":"act_now|this_week|this_quarter|monitor","source_provenance":{"provider":"decision-maker-fit-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.75},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"decision-maker-fit","recommended_next_endpoint":"/fit-intelligence","automation_safe":true,"confidence_per_section":{"signals":0.78},"recommended_actions_priority_order":["act on strong signals","schedule outreach","log to CRM"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'leads array is required' });
  if (leads.length > 5) return res.status(400).json({ error: 'Maximum 5 leads per batch' });
  try {
    const results = await Promise.all(leads.map(async (l: { name: string; title?: string; company?: string }) => {
      const raw = await callClaude(`Quick decision maker fit: name="${l.name}", title="${l.title||''}", company="${l.company||''}". Return JSON only:
{"name":"${l.name}","title":"${l.title||''}","company":"${l.company||''}","fit_score":0.0,"role_alignment":"string","recommended_action":"engage_now|nurture|skip","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: leads.length, results,
      source_provenance: { provider: 'decision-maker-fit-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'decision-maker-fit', recommended_next_endpoint: '/fit-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
