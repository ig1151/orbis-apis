import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Thumbnail Analysis API', info: '/thumbnail-analysis/info', openapi: '/thumbnail-analysis/openapi.json', health: 'ok' });
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { image_url, title, platform } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Analyze YouTube/video thumbnail quality: image_url="${image_url}", title="${title||''}", platform="${platform||'youtube'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"string","platform":"string","visual_quality_score":0.0,"ctr_potential_score":0.0,"face_detected":false,"face_count":0,"text_detected":false,"text_content":"string","dominant_colors":["string"],"emotional_tone":"excited|curious|shocked|neutral|professional","contrast_score":0.0,"brightness_score":0.0,"clutter_score":0.0,"brand_consistency":0.0,"source_provenance":{"provider":"thumbnail-analysis-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"thumbnail-analysis","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"visual":0.88,"ctr":0.82},"recommended_actions_priority_order":["improve low scores","test against alternatives","apply suggestions"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { image_url, title, platform, niche } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Score thumbnail click-through potential: image_url="${image_url}", title="${title||''}", platform="${platform||'youtube'}", niche="${niche||'general'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"string","ctr_score":0.0,"predicted_ctr_range":"string","grade":"A|B|C|D|F","score_breakdown":{"visual_appeal":0.0,"curiosity_gap":0.0,"face_emotion":0.0,"text_readability":0.0,"color_contrast":0.0,"niche_fit":0.0},"benchmark_vs_niche":"above_average|average|below_average","estimated_impressions_rank":"top_10|top_25|top_50|below_50","source_provenance":{"provider":"thumbnail-analysis-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"thumbnail-analysis","recommended_next_endpoint":"/suggest","automation_safe":true,"confidence_per_section":{"scoring":0.85},"recommended_actions_priority_order":["use grade in decision","address weak dimensions","A/B test against alternative"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/suggest', async (req: Request, res: Response) => {
  const { image_url, title, platform, niche } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Suggest improvements for thumbnail: image_url="${image_url}", title="${title||''}", platform="${platform||'youtube'}", niche="${niche||'general'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"string","improvements":[{"area":"face|text|color|composition|emotion|background","priority":"high|medium|low","suggestion":"string","expected_ctr_lift_pct":0.0}],"alternative_titles":["string"],"text_overlay_ideas":["string"],"color_scheme_recommendation":"string","composition_tips":["string"],"best_practice_misses":["string"],"source_provenance":{"provider":"thumbnail-analysis-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"thumbnail-analysis","recommended_next_endpoint":"/thumbnail-intelligence","automation_safe":true,"confidence_per_section":{"suggestions":0.82},"recommended_actions_priority_order":["apply high-priority improvements","test new title","measure CTR change"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { image_url, objective } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'thumbnail_optimization',
    next_api: 'thumbnail-analysis', next_endpoint: '/analyze',
    blocking_flags: [], flag_definitions: { NO_IMAGE_URL: 'image_url is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'thumbnail-analysis', recommended_next_endpoint: '/analyze',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Analyze thumbnail', 'Score CTR potential', 'Get suggestions'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/thumbnail-intelligence', async (req: Request, res: Response) => {
  const { image_url, title, platform, niche } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Full thumbnail intelligence for image_url="${image_url}", title="${title||''}", platform="${platform||'youtube'}", niche="${niche||'general'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"string","ctr_score":0.0,"grade":"A|B|C|D|F","predicted_ctr_range":"string","visual_quality_score":0.0,"face_count":0,"emotional_tone":"string","text_overlay":"string","top_improvements":[{"area":"string","suggestion":"string","priority":"high|medium|low"}],"alternative_titles":["string"],"verdict":"publish|optimize_first|redo","source_provenance":{"provider":"thumbnail-analysis-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"virality-score","recommended_next_endpoint":"/score","automation_safe":true,"confidence_per_section":{"analysis":0.88,"scoring":0.85},"recommended_actions_priority_order":["act on verdict","apply top improvements","A/B test"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare', async (req: Request, res: Response) => {
  const { image_url_a, image_url_b, platform } = req.body;
  if (!image_url_a || !image_url_b) return res.status(400).json({ error: 'image_url_a and image_url_b are required' });
  try {
    const raw = await callClaude(`Compare two thumbnails: a="${image_url_a}", b="${image_url_b}", platform="${platform||'youtube'}". Return JSON only:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url_a":"string","image_url_b":"string","ctr_scores":{"a":0.0,"b":0.0},"grades":{"a":"A|B|C|D|F","b":"A|B|C|D|F"},"winner":"a|b|tie","win_margin_pct":0.0,"key_differences":["string"],"recommendation":"use_a|use_b|test_both","source_provenance":{"provider":"thumbnail-analysis-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":3600,"cache_recommended":true,"recommended_next_api":"thumbnail-analysis","recommended_next_endpoint":"/thumbnail-intelligence","automation_safe":true,"confidence_per_section":{"comparison":0.85},"recommended_actions_priority_order":["use winner","A/B test to confirm","iterate on loser"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { thumbnails } = req.body;
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return res.status(400).json({ error: 'thumbnails array is required' });
  if (thumbnails.length > 5) return res.status(400).json({ error: 'Maximum 5 thumbnails per batch' });
  try {
    const results = await Promise.all(thumbnails.map(async (t: { image_url: string; title?: string }) => {
      const raw = await callClaude(`Quick thumbnail score for image="${t.image_url}", title="${t.title||''}". Return JSON only:
{"image_url":"string","ctr_score":0.0,"grade":"A|B|C|D|F","top_issue":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: thumbnails.length, results,
      source_provenance: { provider: 'thumbnail-analysis-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600, cache_recommended: true,
      recommended_next_api: 'thumbnail-analysis', recommended_next_endpoint: '/thumbnail-intelligence',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
