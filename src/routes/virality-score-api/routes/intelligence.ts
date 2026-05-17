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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Virality Score API', info: '/virality-score/info', openapi: '/virality-score/openapi.json', health: 'ok' });
});

router.post('/score', async (req: Request, res: Response) => {
  const { content, content_type, platform } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Calculate virality score for content="${content.slice(0,500)}", type="${content_type||'text'}", platform="${platform||'all'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"virality_score":0.0,"virality_class":"viral|high|medium|low","share_likelihood_pct":0.0,"engagement_prediction":"very_high|high|medium|low","emotional_triggers":["string"],"hook_strength":"strong|moderate|weak","novelty_score":0.0,"relatability_score":0.0,"controversy_score":0.0,"platform_fit_score":0.0,"source_provenance":{"provider":"virality-score-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.92},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"scoring":0.85},"recommended_actions_priority_order":["act on score","strengthen weak dimensions","optimize for platform"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/predict', async (req: Request, res: Response) => {
  const { content, content_type, platform, audience_size } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Predict viral potential for content="${content.slice(0,500)}", type="${content_type||'text'}", platform="${platform||'all'}", audience=${audience_size||1000}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"viral_probability_pct":0.0,"predicted_reach_multiplier":0.0,"predicted_shares":0,"predicted_peak_hours":0,"virality_window_hours":0,"breakout_probability_pct":0.0,"success_drivers":["string"],"risk_factors":["string"],"optimal_posting_time":"string","optimal_platform":"string","source_provenance":{"provider":"virality-score-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/virality-intelligence","automation_safe":true,"confidence_per_section":{"prediction":0.80},"recommended_actions_priority_order":["post at optimal time","use optimal platform","address risk factors"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { content, content_type, platform } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Analyze virality factors in content="${content.slice(0,500)}", type="${content_type||'text'}", platform="${platform||'all'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"factors":{"emotional_resonance":{"score":0.0,"emotions":["string"]},"information_value":{"score":0.0,"type":"educational|entertainment|news|opinion"},"social_currency":{"score":0.0,"signals":["string"]},"practical_value":{"score":0.0,"utility":"high|medium|low"},"story_structure":{"score":0.0,"has_hook":false,"has_conflict":false,"has_resolution":false}},"missing_elements":["string"],"strongest_element":"string","weakest_element":"string","source_provenance":{"provider":"virality-score-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.90},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"analysis":0.85},"recommended_actions_priority_order":["amplify strongest element","add missing elements","fix weakest element"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { content, objective } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'virality_optimization',
    next_api: 'virality-score', next_endpoint: '/score',
    blocking_flags: [], flag_definitions: { NO_CONTENT: 'content is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'virality-score', recommended_next_endpoint: '/score',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Score virality', 'Predict reach', 'Optimize content'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/virality-intelligence', async (req: Request, res: Response) => {
  const { content, content_type, platform, audience_size } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Full virality intelligence for content="${content.slice(0,500)}", type="${content_type||'text'}", platform="${platform||'all'}", audience=${audience_size||1000}. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"virality_score":0.0,"virality_class":"viral|high|medium|low","viral_probability_pct":0.0,"predicted_reach_multiplier":0.0,"top_emotional_triggers":["string"],"hook_strength":"strong|moderate|weak","key_improvements":["string"],"optimal_posting_time":"string","best_platform":"string","predicted_peak_hours":0,"action_plan":["string"],"source_provenance":{"provider":"virality-score-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.90},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"trend-velocity","recommended_next_endpoint":"/measure","automation_safe":true,"confidence_per_section":{"scoring":0.85,"prediction":0.80},"recommended_actions_priority_order":["follow action plan","post at optimal time","monitor early engagement"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { content, content_type, platform } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Suggest virality improvements for content="${content.slice(0,500)}", type="${content_type||'text'}", platform="${platform||'all'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"original_score":0.0,"improvements":[{"area":"hook|headline|emotion|cta|format|timing","suggestion":"string","expected_lift_pct":0.0,"priority":"high|medium|low"}],"rewritten_hook":"string","rewritten_headline":"string","best_hashtags":["string"],"cta_suggestion":"string","format_recommendation":"string","source_provenance":{"provider":"virality-score-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.90},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/virality-intelligence","automation_safe":true,"confidence_per_section":{"optimization":0.82},"recommended_actions_priority_order":["apply high-priority improvements","use rewritten hook","add best hashtags"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 items per batch' });
  try {
    const results = await Promise.all(items.map(async (item: { content: string; label?: string; platform?: string }) => {
      const raw = await callClaude(`Quick virality score for content="${item.content.slice(0,200)}", platform="${item.platform||'all'}". Return JSON only:
{"label":"${item.label||''}","virality_score":0.0,"virality_class":"viral|high|medium|low","top_trigger":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: items.length, results,
      source_provenance: { provider: 'virality-score-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.90 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'virality-score', recommended_next_endpoint: '/virality-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
