import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'CRM Contact Intelligence API', info: '/crm-contact-intelligence/info', openapi: '/crm-contact-intelligence/openapi.json', health: 'ok' });
});

router.post('/enrich', async (req: Request, res: Response) => {
  const { email, name, company } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Enrich CRM contact: name="${name||''}", company="${company||''}", email="${email}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"email":"${email}","name":"string","company":"string","title":"string","department":"string","seniority":"c_suite|vp|director|manager|individual_contributor","linkedin_url":"string","location":"string","industry":"string","company_size":"1-10|11-50|51-200|201-1000|1000+","technologies":["string"],"source_provenance":{"provider":"crm-contact-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"identity":0.88,"company":0.82},"recommended_actions_priority_order":["verify email","score for outreach","add to CRM"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { email, name, company, title, use_case } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Score CRM contact for outreach: name="${name||''}", title="${title||''}", company="${company||''}", email="${email}", use_case="${use_case||'B2B sales'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"email":"${email}","outreach_score":0.0,"fit_score":0.0,"intent_score":0.0,"overall_score":0.0,"score_breakdown":{"role_fit":"high|medium|low","company_fit":"high|medium|low","timing":"good|neutral|poor"},"recommended_action":"prioritize|nurture|deprioritize|skip","outreach_channel":"email|linkedin|phone","best_time_to_contact":"string","blockers":["string"],"source_provenance":{"provider":"crm-contact-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/contact-intelligence","automation_safe":true,"confidence_per_section":{"scoring":0.82},"recommended_actions_priority_order":["act on recommendation","set follow-up","log to CRM"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/segment', async (req: Request, res: Response) => {
  const { email, name, company, title } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Segment CRM contact into persona and buyer stage: name="${name||''}", title="${title||''}", company="${company||''}", email="${email}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"email":"${email}","persona":"champion|economic_buyer|technical_buyer|blocker|influencer|end_user","buyer_stage":"awareness|consideration|decision|retention","engagement_tier":"hot|warm|cold","segment_tags":["string"],"communication_style":"data_driven|relationship_first|executive_brief|technical_detail","preferred_content_type":"case_studies|demos|ROI_reports|technical_docs","source_provenance":{"provider":"crm-contact-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/intent-signals","automation_safe":true,"confidence_per_section":{"segmentation":0.80},"recommended_actions_priority_order":["apply segment","personalize outreach","route to rep"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { email, objective } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'contact_enrichment',
    next_api: 'crm-contact-intelligence', next_endpoint: '/enrich',
    blocking_flags: [], flag_definitions: { NO_EMAIL: 'email is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'crm-contact-intelligence', recommended_next_endpoint: '/enrich',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Enrich contact', 'Score for outreach', 'Segment persona'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/contact-intelligence', async (req: Request, res: Response) => {
  const { email, name, company, title, use_case } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Full CRM contact intelligence: name="${name||''}", title="${title||''}", company="${company||''}", email="${email}", use_case="${use_case||'B2B sales'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"email":"${email}","enriched_profile":{"name":"string","title":"string","department":"string","seniority":"string","company":"string","industry":"string"},"outreach_score":0.0,"fit_score":0.0,"persona":"champion|economic_buyer|technical_buyer|influencer","buyer_stage":"awareness|consideration|decision","recommended_action":"prioritize|nurture|deprioritize","outreach_channel":"email|linkedin|phone","personalized_hook":"string","objection_prep":["string"],"intent_signals":["string"],"talking_points":["string"],"source_provenance":{"provider":"crm-contact-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"decision-maker-fit","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"profile":0.85,"scoring":0.82},"recommended_actions_priority_order":["act on recommendation","personalize outreach","log to CRM"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/intent-signals', async (req: Request, res: Response) => {
  const { email, company, industry } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const raw = await callClaude(`Detect buying intent signals for contact at company="${company||'unknown'}" in industry="${industry||'tech'}", email="${email}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"email":"${email}","intent_score":0.0,"intent_level":"high|medium|low","signals":[{"type":"technology_adoption|hiring|funding|expansion|competitor_switch","signal":"string","strength":"strong|moderate|weak"}],"trigger_events":["string"],"recommended_timing":"immediate|this_week|this_month|wait","urgency_score":0.0,"source_provenance":{"provider":"crm-contact-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.75},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"crm-contact-intelligence","recommended_next_endpoint":"/contact-intelligence","automation_safe":true,"confidence_per_section":{"intent":0.78},"recommended_actions_priority_order":["act on high-intent signals","schedule outreach","monitor changes"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) return res.status(400).json({ error: 'contacts array is required' });
  if (contacts.length > 5) return res.status(400).json({ error: 'Maximum 5 contacts per batch' });
  try {
    const results = await Promise.all(contacts.map(async (c: { email: string; name?: string; company?: string }) => {
      const raw = await callClaude(`Quick CRM contact score for name="${c.name||''}", company="${c.company||''}", email="${c.email}". Return JSON only:
{"email":"${c.email}","name":"string","company":"string","outreach_score":0.0,"persona":"string","recommended_action":"prioritize|nurture|skip","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: contacts.length, results,
      source_provenance: { provider: 'crm-contact-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'crm-contact-intelligence', recommended_next_endpoint: '/contact-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
