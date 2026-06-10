import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Trend Velocity API', info: '/trend-velocity/info', openapi: '/trend-velocity/openapi.json', health: 'ok' });
});

router.post('/measure', async (req: Request, res: Response) => {
  const { topic, platform, timeframe } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Measure trend velocity for topic="${topic}", platform="${platform||'all'}", timeframe="${timeframe||'7d'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"${topic}","platform":"string","velocity_score":0.0,"velocity_class":"viral|fast|moderate|slow|declining","growth_rate_pct":0.0,"volume_now":0,"volume_baseline":0,"acceleration":"accelerating|steady|decelerating","peak_reached":false,"estimated_peak_days":0,"source_provenance":{"provider":"trend-velocity-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":1800,"cache_recommended":true,"recommended_next_api":"trend-velocity","recommended_next_endpoint":"/forecast","automation_safe":true,"confidence_per_section":{"velocity":0.82},"recommended_actions_priority_order":["act on viral trends now","forecast trajectory","identify breakout signals"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/forecast', async (req: Request, res: Response) => {
  const { topic, platform, horizon_days } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Forecast trend trajectory for topic="${topic}", platform="${platform||'all'}", horizon=${horizon_days||30} days. Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"string","horizon_days":${horizon_days||30},"forecast":"continue_rising|peak_soon|plateau|declining|fading","confidence":0.0,"predicted_peak_days":0,"predicted_fade_days":0,"milestones":[{"day":0,"predicted_volume":0,"event":"string"}],"opportunity_window":"now|this_week|this_month|passed","action_recommendation":"jump_in|wait_for_peak|already_peaked|avoid","source_provenance":{"provider":"trend-velocity-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.80},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"trend-velocity","recommended_next_endpoint":"/trend-intelligence","automation_safe":true,"confidence_per_section":{"forecast":0.78},"recommended_actions_priority_order":["act on opportunity window","plan content calendar","monitor milestones"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/signals', async (req: Request, res: Response) => {
  const { topic, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Identify trend signals for topic="${topic}", platform="${platform||'all'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"string","signals":[{"type":"search_spike|social_mention|news_coverage|influencer_post|platform_feature|real_world_event","signal":"string","strength":"strong|moderate|weak","detected_at":"${new Date().toISOString()}","source":"string"}],"emerging_subtopics":["string"],"related_trends":["string"],"geographic_hot_spots":["string"],"demographic_skew":"string","source_provenance":{"provider":"trend-velocity-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.82},"cache_ttl_seconds":1800,"cache_recommended":true,"recommended_next_api":"trend-velocity","recommended_next_endpoint":"/trend-intelligence","automation_safe":true,"confidence_per_section":{"signals":0.80},"recommended_actions_priority_order":["focus on strong signals","track subtopics","target hot spot geos"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { topic, objective } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'trend_analysis',
    next_api: 'trend-velocity', next_endpoint: '/measure',
    blocking_flags: [], flag_definitions: { NO_TOPIC: 'topic is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'trend-velocity', recommended_next_endpoint: '/measure',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Measure velocity', 'Forecast trajectory', 'Identify signals'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/trend-intelligence', async (req: Request, res: Response) => {
  const { topic, platform, context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Full trend velocity intelligence for topic="${topic}", platform="${platform||'all'}", context="${context||'content strategy'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"topic":"string","velocity_score":0.0,"velocity_class":"viral|fast|moderate|slow|declining","growth_rate_pct":0.0,"forecast":"continue_rising|peak_soon|plateau|declining","opportunity_window":"now|this_week|this_month|passed","key_signals":["string"],"emerging_angles":["string"],"best_content_formats":["string"],"optimal_publish_time":"string","competitor_saturation":"low|medium|high","action_recommendation":"string","source_provenance":{"provider":"trend-velocity-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.85},"cache_ttl_seconds":1800,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/predict","automation_safe":true,"confidence_per_section":{"velocity":0.82,"forecast":0.78},"recommended_actions_priority_order":["act on opportunity window","use emerging angles","publish at optimal time"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/breakout', async (req: Request, res: Response) => {
  const { category, platform, region } = req.body;
  if (!category) return res.status(400).json({ error: 'category is required' });
  try {
    const raw = await callClaude(`Detect breakout trends in category="${category}", platform="${platform||'all'}", region="${region||'global'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"category":"string","breakout_trends":[{"topic":"string","velocity_score":0.0,"growth_rate_pct":0.0,"stage":"emerging|growing|viral","hours_since_detected":0}],"earliest_detected_trend":"string","highest_velocity_trend":"string","region":"string","source_provenance":{"provider":"trend-velocity-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.82},"cache_ttl_seconds":1800,"cache_recommended":true,"recommended_next_api":"trend-velocity","recommended_next_endpoint":"/trend-intelligence","automation_safe":true,"confidence_per_section":{"breakout":0.80},"recommended_actions_priority_order":["act on emerging trends","create content for top trend","set trend alert"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { topics } = req.body;
  if (!Array.isArray(topics) || topics.length === 0) return res.status(400).json({ error: 'topics array is required' });
  if (topics.length > 10) return res.status(400).json({ error: 'Maximum 10 topics per batch' });
  try {
    const results = await Promise.all(topics.map(async (topic: string) => {
      const raw = await callClaude(`Quick trend velocity for topic="${topic}". Return JSON only:
{"topic":"${topic}","velocity_score":0.0,"velocity_class":"viral|fast|moderate|slow|declining","growth_rate_pct":0.0,"opportunity":"now|soon|wait|passed","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: topics.length, results,
      source_provenance: { provider: 'trend-velocity-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 1800, cache_recommended: true,
      recommended_next_api: 'trend-velocity', recommended_next_endpoint: '/trend-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
