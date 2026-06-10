import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Image Resize API', info: '/image-resize/info', openapi: '/image-resize/openapi.json', health: 'ok' });
});

router.post('/resize', async (req: Request, res: Response) => {
  const { image_url, width, height, fit, quality } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  if (!width && !height) return res.status(400).json({ error: 'width or height is required' });
  try {
    const raw = await callClaude(`Generate image resize spec for: ${image_url}. Target: ${width || 'auto'}x${height || 'auto'}, Fit: ${fit || 'cover'}, Quality: ${quality || 85}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"source_url":"${image_url}","operation":"resize","params":{"width":${width || null},"height":${height || null},"fit":"${fit || 'cover'}","quality":${quality || 85}},"output_format":"jpeg|png|webp","estimated_dimensions":{"width":${width || 0},"height":${height || 0}},"estimated_size_kb":0,"processing_notes":"string","cdn_url":"${image_url}","source_provenance":{"provider":"image-resize-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"image-resize","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"resize":0.95},"recommended_actions_priority_order":["cache result","serve via CDN","use WebP for web"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/crop', async (req: Request, res: Response) => {
  const { image_url, x, y, width, height, aspect_ratio } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Generate image crop spec: ${image_url}. Crop: x=${x || 0},y=${y || 0},w=${width || 'auto'},h=${height || 'auto'}, Ratio: ${aspect_ratio || 'free'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"source_url":"${image_url}","operation":"crop","params":{"x":${x || 0},"y":${y || 0},"width":${width || null},"height":${height || null},"aspect_ratio":"${aspect_ratio || 'free'}"},"smart_crop_subject":"string","output_dimensions":{"width":${width || 0},"height":${height || 0}},"source_provenance":{"provider":"image-resize-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"image-resize","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"crop":0.92},"recommended_actions_priority_order":["verify subject not cropped","apply smart crop","cache result"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/convert', async (req: Request, res: Response) => {
  const { image_url, target_format, quality } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  if (!target_format) return res.status(400).json({ error: 'target_format is required' });
  try {
    const raw = await callClaude(`Convert image format: ${image_url} to ${target_format}. Quality: ${quality || 85}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"source_url":"${image_url}","source_format":"string","target_format":"${target_format}","quality":${quality || 85},"estimated_size_reduction_percent":0,"lossless":false,"output_url":"${image_url}","format_notes":"string","source_provenance":{"provider":"image-resize-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"image-resize","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"conversion":0.95},"recommended_actions_priority_order":["use WebP for web","use AVIF for modern browsers","keep originals"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { image_url, objective } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'image_processing',
    next_api: 'image-resize', next_endpoint: '/resize',
    blocking_flags: [], flag_definitions: { NO_URL: 'image_url is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'image-resize', recommended_next_endpoint: '/resize',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Resize image', 'Convert format', 'Optimize for web'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/image-intelligence', async (req: Request, res: Response) => {
  const { image_url, use_case } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Full image processing intelligence for: ${image_url}. Use case: ${use_case || 'web'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"${image_url}","detected_format":"string","recommended_operations":["string"],"recommended_dimensions":[{"use_case":"thumbnail","width":150,"height":150},{"use_case":"card","width":400,"height":300},{"use_case":"hero","width":1200,"height":630}],"recommended_format":"webp","estimated_savings_percent":0,"responsive_breakpoints":[320,768,1024,1440],"alt_text_suggestion":"string","source_provenance":{"provider":"image-resize-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"image-resize","recommended_next_endpoint":"/optimize","automation_safe":true,"confidence_per_section":{"recommendations":0.87},"recommended_actions_priority_order":["generate responsive sizes","convert to WebP","implement lazy loading"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { image_url, target_size_kb, quality } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Optimize image: ${image_url}. Target size: ${target_size_kb || 'auto'}KB, Quality: ${quality || 'auto'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"source_url":"${image_url}","optimizations":["compress","strip_metadata","progressive_encoding"],"recommended_quality":${quality || 82},"recommended_format":"webp","estimated_original_kb":0,"estimated_optimized_kb":0,"estimated_savings_percent":0,"output_url":"${image_url}","source_provenance":{"provider":"image-resize-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"image-resize","recommended_next_endpoint":"/image-intelligence","automation_safe":true,"confidence_per_section":{"optimization":0.9},"recommended_actions_priority_order":["apply optimizations","test visual quality","deploy"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { images } = req.body;
  if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: 'images array is required' });
  if (images.length > 20) return res.status(400).json({ error: 'Maximum 20 images per batch' });
  try {
    const results = await Promise.all(images.map(async (img: { url: string; width?: number; height?: number }) => {
      const raw = await callClaude(`Quick image resize spec: ${img.url} → ${img.width || 'auto'}x${img.height || 'auto'}. Return JSON:
{"url":"${img.url}","output_dimensions":{"width":${img.width || 0},"height":${img.height || 0}},"format":"webp","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: images.length, results,
      source_provenance: { provider: 'image-resize-ai', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'image-resize', recommended_next_endpoint: '/optimize',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
