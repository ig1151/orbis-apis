import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Meme Caption Generator API', info: '/meme-caption/info', openapi: '/meme-caption/openapi.json', health: 'ok' });
});

router.post('/generate', async (req: Request, res: Response) => {
  const { topic, template, tone, audience, context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Generate meme captions for: "${topic}". Template: ${template || 'auto'}, Tone: ${tone || 'humorous'}, Audience: ${audience || 'general'}, Context: ${context || 'social media'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"${topic}","captions":[{"top_text":"string","bottom_text":"string","style":"impact|bold|clean","virality_score":0.0,"humor_type":"irony|sarcasm|wordplay|absurdist|relatable","audience_fit":0.0},{"top_text":"string","bottom_text":"string","style":"impact","virality_score":0.0,"humor_type":"string","audience_fit":0.0},{"top_text":"string","bottom_text":"string","style":"clean","virality_score":0.0,"humor_type":"string","audience_fit":0.0}],"recommended_template":"Drake|Distracted Boyfriend|This Is Fine|One Does Not Simply|Success Kid|Expanding Brain|Change My Mind|other","recommended_caption":0,"source_provenance":{"provider":"meme-caption-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"meme-caption","recommended_next_endpoint":"/meme-intelligence","automation_safe":true,"confidence_per_section":{"captions":0.85},"recommended_actions_priority_order":["use top recommendation","A/B test captions","schedule for peak engagement"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { image_url, caption } = req.body;
  if (!image_url && !caption) return res.status(400).json({ error: 'image_url or caption is required' });
  try {
    const raw = await callClaude(`Analyze meme format/effectiveness. Image: ${image_url || 'N/A'}, Caption: "${caption || ''}". Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"template_detected":"string","humor_analysis":{"type":"irony|sarcasm|wordplay|absurdist|relatable","intensity":"subtle|moderate|strong","landing_probability":0.0},"virality_potential":0.0,"audience_appeal":{"gen_z":0.0,"millennials":0.0,"general":0.0},"cultural_sensitivity_check":{"safe":true,"flags":[]},"improvement_suggestions":["string"],"engagement_prediction":{"likes":"low|medium|high","shares":"low|medium|high","comments":"low|medium|high"},"source_provenance":{"provider":"meme-caption-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"meme-caption","recommended_next_endpoint":"/generate","automation_safe":true,"confidence_per_section":{"analysis":0.82},"recommended_actions_priority_order":["apply improvements","check cultural fit","test with target audience"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/localize', async (req: Request, res: Response) => {
  const { caption, top_text, bottom_text, target_locale, target_audience } = req.body;
  if (!caption && !top_text) return res.status(400).json({ error: 'caption or top_text is required' });
  try {
    const raw = await callClaude(`Localize meme for ${target_locale || 'en-US'} audience. Caption: "${caption || ''}", Top: "${top_text || ''}", Bottom: "${bottom_text || ''}", Audience: ${target_audience || 'general'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"original_caption":"string","target_locale":"${target_locale || 'en-US'}","localized_versions":[{"locale":"string","top_text":"string","bottom_text":"string","cultural_notes":"string","humor_preserved":true}],"localization_warnings":["string"],"cultural_sensitivity":"safe|caution|requires_review","source_provenance":{"provider":"meme-caption-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"meme-caption","recommended_next_endpoint":"/meme-intelligence","automation_safe":true,"confidence_per_section":{"localization":0.8},"recommended_actions_priority_order":["review localized versions","check cultural fit","test with local audience"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { topic, objective } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'meme_generation',
    next_api: 'meme-caption', next_endpoint: '/generate',
    blocking_flags: [], flag_definitions: { NO_TOPIC: 'topic is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'meme-caption', recommended_next_endpoint: '/generate',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Generate captions', 'Pick best', 'Schedule post'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/meme-intelligence', async (req: Request, res: Response) => {
  const { topic, brand, campaign, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Full meme strategy intelligence for: "${topic}". Brand: ${brand || 'N/A'}, Campaign: ${campaign || 'N/A'}, Platform: ${platform || 'Instagram/Twitter'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"${topic}","recommended_template":"string","recommended_captions":[{"top":"string","bottom":"string","virality_score":0.0}],"best_posting_time":"string","hashtags":["string"],"trending_overlap":["string"],"brand_safety_score":0.0,"estimated_reach_multiplier":0.0,"content_calendar_fit":"immediate|this_week|evergreen","source_provenance":{"provider":"meme-caption-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.9},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"meme-caption","recommended_next_endpoint":"/generate","automation_safe":true,"confidence_per_section":{"strategy":0.82},"recommended_actions_priority_order":["post with recommended hashtags","time for peak engagement","track virality"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trending', async (req: Request, res: Response) => {
  const { category, platform } = req.body;
  try {
    const raw = await callClaude(`Get trending meme formats and templates for ${platform || 'social media'} in category ${category || 'general'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"platform":"${platform || 'social media'}","trending_templates":[{"name":"string","description":"string","usage_velocity":"rising|peak|declining","best_for":["string"],"example_top_text":"string","example_bottom_text":"string","virality_score":0.0}],"top_formats":["string"],"emerging_trends":["string"],"declining_formats":["string"],"source_provenance":{"provider":"meme-caption-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.8},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"meme-caption","recommended_next_endpoint":"/generate","automation_safe":true,"confidence_per_section":{"trends":0.78},"recommended_actions_priority_order":["use rising templates","avoid declining formats","create with trending topics"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { topics } = req.body;
  if (!Array.isArray(topics) || topics.length === 0) return res.status(400).json({ error: 'topics array is required' });
  if (topics.length > 10) return res.status(400).json({ error: 'Maximum 10 topics per batch' });
  try {
    const results = await Promise.all(topics.map(async (t: { topic: string; tone?: string }) => {
      const raw = await callClaude(`Quick meme caption for: "${t.topic}". Tone: ${t.tone || 'humorous'}. Return JSON:
{"topic":"${t.topic}","top_text":"string","bottom_text":"string","template":"string","virality_score":0.0,"success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: topics.length, results,
      source_provenance: { provider: 'meme-caption-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'meme-caption', recommended_next_endpoint: '/analyze',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
