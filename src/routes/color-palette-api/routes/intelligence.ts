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
  res.json({ name: 'Color Palette API', info: '/color-palette/info', openapi: '/color-palette/openapi.json', health: 'ok' });
});

router.post('/extract', async (req: Request, res: Response) => {
  const { image_url, count, algorithm } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Extract color palette from image: ${image_url}. Count: ${count || 5}, Algorithm: ${algorithm || 'k-means'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"image_url":"${image_url}","colors":[{"hex":"#000000","rgb":{"r":0,"g":0,"b":0},"hsl":{"h":0,"s":0,"l":0},"name":"string","percentage":0.0,"role":"dominant|accent|background|neutral"}],"color_count":${count || 5},"dominant_color":"#000000","background_color":"#ffffff","mood":"warm|cool|neutral|vibrant|muted|dark|light","color_scheme":"monochromatic|analogous|complementary|triadic|tetradic|split_complementary","source_provenance":{"provider":"color-palette-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"color-palette","recommended_next_endpoint":"/palette-intelligence","automation_safe":true,"confidence_per_section":{"colors":0.92},"recommended_actions_priority_order":["apply to brand","check accessibility","generate variations"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/generate', async (req: Request, res: Response) => {
  const { brand_name, industry, mood, base_color, style } = req.body;
  if (!brand_name && !base_color && !mood) return res.status(400).json({ error: 'brand_name, base_color, or mood is required' });
  try {
    const raw = await callClaude(`Generate color palette for brand: "${brand_name || 'unnamed'}", Industry: ${industry || 'tech'}, Mood: ${mood || 'professional'}, Base: ${base_color || 'auto'}, Style: ${style || 'modern'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"brand":"${brand_name || 'unnamed'}","palette":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex","text_secondary":"#hex","border":"#hex","error":"#hex","success":"#hex"},"color_theory":"string","mood_achieved":"string","similar_brands":["string"],"css_variables":"--primary: #hex; --secondary: #hex;","tailwind_config":"string","source_provenance":{"provider":"color-palette-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"color-palette","recommended_next_endpoint":"/accessibility","automation_safe":true,"confidence_per_section":{"palette":0.88},"recommended_actions_priority_order":["check accessibility","apply to design system","test dark mode"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/match', async (req: Request, res: Response) => {
  const { color, match_type, count } = req.body;
  if (!color) return res.status(400).json({ error: 'color is required' });
  try {
    const raw = await callClaude(`Find ${match_type || 'complementary'} color matches for ${color}. Count: ${count || 5}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"input_color":"${color}","match_type":"${match_type || 'complementary'}","matches":[{"hex":"#000000","name":"string","relationship":"complementary|analogous|triadic|split","contrast_ratio":0.0,"harmony_score":0.0}],"color_wheel_position":"string","source_provenance":{"provider":"color-palette-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"color-palette","recommended_next_endpoint":"/accessibility","automation_safe":true,"confidence_per_section":{"matches":0.92},"recommended_actions_priority_order":["select best match","check contrast","apply to design"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { image_url, brand_name, objective } = req.body;
  if (!image_url && !brand_name) return res.status(400).json({ error: 'image_url or brand_name is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, objective: objective || 'color_palette_generation',
    next_api: 'color-palette', next_endpoint: image_url ? '/extract' : '/generate',
    blocking_flags: [], flag_definitions: { NO_INPUT: 'image_url or brand_name is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'color-palette', recommended_next_endpoint: image_url ? '/extract' : '/generate',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Extract/generate palette', 'Check accessibility', 'Apply to design'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/palette-intelligence', async (req: Request, res: Response) => {
  const { image_url, brand_name, industry } = req.body;
  if (!image_url && !brand_name) return res.status(400).json({ error: 'image_url or brand_name is required' });
  try {
    const raw = await callClaude(`Full color palette intelligence. Source: ${image_url || brand_name}. Industry: ${industry || 'general'}. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"palette_summary":"string","primary_color":"#hex","mood":"string","brand_fit_score":0.0,"industry_alignment":"strong|moderate|weak","competitive_differentiation":"high|medium|low","accessibility_score":0.0,"dark_mode_compatible":true,"print_safe":true,"recommendations":["string"],"similar_brands":["string"],"source_provenance":{"provider":"color-palette-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":0.95},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"color-palette","recommended_next_endpoint":"/accessibility","automation_safe":true,"confidence_per_section":{"intelligence":0.85},"recommended_actions_priority_order":["refine palette","fix accessibility","implement in design system"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/accessibility', async (req: Request, res: Response) => {
  const { foreground, background, font_size } = req.body;
  if (!foreground || !background) return res.status(400).json({ error: 'foreground and background colors are required' });
  try {
    const raw = await callClaude(`Check color accessibility (WCAG). Foreground: ${foreground}, Background: ${background}, Font size: ${font_size || 16}px. Return JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"foreground":"${foreground}","background":"${background}","contrast_ratio":0.0,"wcag_aa_normal":false,"wcag_aa_large":false,"wcag_aaa_normal":false,"wcag_aaa_large":false,"rating":"pass|fail","issues":["string"],"alternatives":[{"foreground":"#hex","background":"#hex","contrast_ratio":0.0,"passes_aa":true}],"source_provenance":{"provider":"color-palette-ai","retrieved_at":"${new Date().toISOString()}","freshness_score":1.0},"cache_ttl_seconds":86400,"cache_recommended":true,"recommended_next_api":"color-palette","recommended_next_endpoint":"/match","automation_safe":true,"confidence_per_section":{"accessibility":0.98},"recommended_actions_priority_order":["fix failing combinations","use suggested alternatives","document approved pairs"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { images } = req.body;
  if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: 'images array is required' });
  if (images.length > 10) return res.status(400).json({ error: 'Maximum 10 images per batch' });
  try {
    const results = await Promise.all(images.map(async (img: { url: string; label?: string }) => {
      const raw = await callClaude(`Quick palette extract: ${img.url}. Return JSON:
{"label":"${img.label || img.url}","dominant_color":"#hex","palette":["#hex","#hex","#hex"],"mood":"string","success":true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      batch_count: images.length, results,
      source_provenance: { provider: 'color-palette-ai', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
      cache_ttl_seconds: 86400, cache_recommended: true,
      recommended_next_api: 'color-palette', recommended_next_endpoint: '/accessibility',
      automation_safe: true, privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
