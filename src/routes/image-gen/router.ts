import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import Redis from 'ioredis';

const router = Router();

let redisClient: Redis | null = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || '');
    redisClient.on('error', (e: Error) => console.error("[image-gen] redis error:", e));
    
  }
  return redisClient;
}

const OPENAI_BASE = "https://api.openai.com/v1";
const KEY_PREFIX   = "image-gen:key:";
const USAGE_PREFIX = "image-gen:usage:";

const DALL_E_COST: Record<string, number> = {
  "1024x1024:standard": 0.04,
  "1024x1024:hd":       0.08,
  "1024x1792:standard": 0.08,
  "1024x1792:hd":       0.12,
  "1792x1024:standard": 0.08,
  "1792x1024:hd":       0.12,
};

const ms = (start: number) => Date.now() - start;

function costEstimate(n: number, size: string, quality: string): number {
  return parseFloat(((DALL_E_COST[`${size}:${quality}`] ?? 0.04) * n).toFixed(4));
}

async function openaiGenerate(prompt: string, size: string, quality: string): Promise<{ url: string; revised_prompt?: string }> {
  const r = await axios.post(
    `${OPENAI_BASE}/images/generations`,
    { model: "dall-e-3", prompt, n: 1, size, quality, response_format: "url" },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
  );
  return r.data.data[0];
}

async function gptMini(messages: object[], maxTokens = 500): Promise<string> {
  const r = await axios.post(
    `${OPENAI_BASE}/chat/completions`,
    { model: "gpt-4o-mini", messages, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
  );
  return r.data.choices[0].message.content.trim();
}

function parseJson(raw: string): any {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return {}; }
}

async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers["x-api-key"] as string) || req.headers.authorization?.replace("Bearer ", "");
  if (!key) return res.status(401).json({ error: "Missing API key", execution_ready: false });
  try {
    const redis = await getRedis();
    const raw = await redis.get(`${KEY_PREFIX}${key}`);
    if (!raw) return res.status(401).json({ error: "Invalid API key", execution_ready: false });
    const keyData = JSON.parse(raw);
    if (!keyData.active) return res.status(403).json({ error: "API key revoked", execution_ready: false });
    const month = new Date().toISOString().slice(0, 7);
    const usage = parseInt((await redis.get(`${USAGE_PREFIX}${key}:${month}`)) || "0", 10);
    if (keyData.quota && usage >= keyData.quota) {
      return res.status(429).json({ error: "Monthly quota exceeded", usage, quota: keyData.quota, execution_ready: false });
    }
    (req as any).apiKey = key;
    (req as any).apiKeyData = keyData;
    next();
  } catch {
    (req as any).apiKey = key;
    next();
  }
}

async function trackUsage(key: string) {
  try {
    const redis = await getRedis();
    const month = new Date().toISOString().slice(0, 7);
    const usageKey = `${USAGE_PREFIX}${key}:${month}`;
    await redis.incr(usageKey);
    await redis.expire(usageKey, 60 * 60 * 24 * 35);
  } catch {}
}

router.post("/keys/generate", async (req: Request, res: Response) => {
  const start = Date.now();
  const { label, quota } = req.body;
  const key = `ig_${crypto.randomUUID().replace(/-/g, "")}`;
  const record = { key, label: label || "default", quota: quota || null, active: true, created_at: new Date().toISOString() };
  try {
    const redis = await getRedis();
    await redis.set(`${KEY_PREFIX}${key}`, JSON.stringify(record));
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate", api_key: key, label: record.label, quota: record.quota, metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.get("/keys", async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const redis = await getRedis();
    const keys = await redis.keys(`${KEY_PREFIX}*`);
    const records = (await Promise.all(keys.map((k: string) => redis.get(k)))).map((v: string | null) => v ? JSON.parse(v) : null).filter(Boolean);
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate", keys: records, total: records.length, metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.delete("/keys/revoke", async (req: Request, res: Response) => {
  const start = Date.now();
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "key is required", execution_ready: false });
  try {
    const redis = await getRedis();
    const raw = await redis.get(`${KEY_PREFIX}${key}`);
    if (!raw) return res.status(404).json({ error: "Key not found", execution_ready: false });
    await redis.set(`${KEY_PREFIX}${key}`, JSON.stringify({ ...JSON.parse(raw), active: false }));
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/keys", revoked: true, key, metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.patch("/keys/quota", async (req: Request, res: Response) => {
  const start = Date.now();
  const { key, quota } = req.body;
  if (!key || quota === undefined) return res.status(400).json({ error: "key and quota required", execution_ready: false });
  try {
    const redis = await getRedis();
    const raw = await redis.get(`${KEY_PREFIX}${key}`);
    if (!raw) return res.status(404).json({ error: "Key not found", execution_ready: false });
    await redis.set(`${KEY_PREFIX}${key}`, JSON.stringify({ ...JSON.parse(raw), quota }));
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/keys", key, quota, metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.get("/usage", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const key = (req as any).apiKey;
  const month = new Date().toISOString().slice(0, 7);
  try {
    const redis = await getRedis();
    const usage = parseInt((await redis.get(`${USAGE_PREFIX}${key}:${month}`)) || "0", 10);
    const keyData = (req as any).apiKeyData;
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate", period: month, usage, quota: keyData?.quota || null, remaining: keyData?.quota ? keyData.quota - usage : null, metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.get("/usage/keys", async (req: Request, res: Response) => {
  const start = Date.now();
  const month = new Date().toISOString().slice(0, 7);
  try {
    const redis = await getRedis();
    const usageKeys = await redis.keys(`${USAGE_PREFIX}*:${month}`);
    const breakdown = await Promise.all(
      usageKeys.map(async (uk: string) => {
        const val = await redis.get(uk);
        const apiKey = uk.replace(USAGE_PREFIX, "").replace(`:${month}`, "");
        return { key: apiKey, usage: parseInt(val || "0", 10), period: month };
      })
    );
    return res.json({ execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate", period: month, keys: breakdown, total_requests: breakdown.reduce((s: number, k: { usage: number }) => s + k.usage, 0), metadata: { latency_ms: ms(start) } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false });
  }
});

router.post("/generate", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const { prompt, size = "1024x1024", quality = "standard", enhance_prompt = false } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required", execution_ready: false });
  try {
    let finalPrompt = prompt;
    if (enhance_prompt) {
      finalPrompt = await gptMini(
        [{ role: "system", content: "Enhance this DALL-E 3 prompt to be more detailed and vivid. Return ONLY the enhanced prompt." }, { role: "user", content: prompt }],
        300
      );
    }
    const image = await openaiGenerate(finalPrompt, size, quality);
    await trackUsage((req as any).apiKey);
    return res.json({
      execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/score-image",
      image_url: image.url, revised_prompt: image.revised_prompt || null,
      original_prompt: prompt, final_prompt: finalPrompt, parameters: { size, quality },
      metadata: { latency_ms: ms(start), estimated_cost: costEstimate(1, size, quality), model: "dall-e-3" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.error?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

router.post("/generate-batch", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const { prompts, size = "1024x1024", quality = "standard" } = req.body;
  if (!Array.isArray(prompts) || prompts.length === 0) return res.status(400).json({ error: "prompts array is required", execution_ready: false });
  if (prompts.length > 5) return res.status(400).json({ error: "Max 5 prompts per batch", execution_ready: false });
  try {
    const results = await Promise.allSettled(prompts.map((p: string) => openaiGenerate(p, size, quality)));
    const images = results.map((r, i) => ({
      index: i, prompt: prompts[i],
      success: r.status === "fulfilled",
      image_url: r.status === "fulfilled" ? r.value.url : null,
      revised_prompt: r.status === "fulfilled" ? r.value.revised_prompt || null : null,
      error: r.status === "rejected" ? r.reason?.response?.data?.error?.message || r.reason?.message : null,
    }));
    const successes = images.filter(i => i.success).length;
    await trackUsage((req as any).apiKey);
    return res.json({
      execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/score-image",
      images, summary: { total: prompts.length, success: successes, failed: prompts.length - successes },
      metadata: { latency_ms: ms(start), estimated_cost: costEstimate(successes, size, quality), model: "dall-e-3" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

router.post("/describe-prompt", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const { concept, subject, style, mood, additional_details } = req.body;
  if (!concept && !subject) return res.status(400).json({ error: "concept or subject is required", execution_ready: false });
  const input = [concept && `Concept: ${concept}`, subject && `Subject: ${subject}`, style && `Style: ${style}`, mood && `Mood: ${mood}`, additional_details && `Details: ${additional_details}`].filter(Boolean).join("\n");
  try {
    const [optimized, rawVariants] = await Promise.all([
      gptMini([{ role: "system", content: "Write ONE optimized DALL-E 3 prompt from these inputs. Return ONLY the prompt." }, { role: "user", content: input }], 300),
      gptMini([{ role: "system", content: "Write 3 distinct DALL-E 3 prompt variations. Return ONLY a JSON array of 3 strings." }, { role: "user", content: input }], 400),
    ]);
    let variants: string[] = [];
    try { variants = JSON.parse(rawVariants.replace(/```json|```/g, "").trim()); } catch { variants = [rawVariants]; }
    return res.json({
      execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate",
      optimized_prompt: optimized, variants, inputs: { concept, subject, style, mood, additional_details },
      metadata: { latency_ms: ms(start), estimated_cost: 0.001, model: "gpt-4o-mini" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

router.post("/score-image", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const { image_url, prompt, scoring_criteria } = req.body;
  if (!image_url) return res.status(400).json({ error: "image_url is required", execution_ready: false });
  const criteria = scoring_criteria || ["prompt_alignment", "visual_quality", "composition", "creativity"];
  try {
    const r = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model: "gpt-4o-mini", max_tokens: 600,
        messages: [{ role: "user", content: [
          { type: "text", text: `Score this image on: ${criteria.join(", ")}.${prompt ? `\nGenerated from: "${prompt}"` : ""}\nReturn ONLY valid JSON: { "scores": {}, "overall_score": 0, "strengths": [], "weaknesses": [], "recommendation": "use|regenerate|refine", "reasoning": "" }` },
          { type: "image_url", image_url: { url: image_url } },
        ]}],
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
    );
    const analysis = parseJson(r.data.choices[0].message.content);
    return res.json({
      execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/generate",
      image_url, ...analysis,
      metadata: { latency_ms: ms(start), estimated_cost: 0.002, model: "gpt-4o-mini" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.error?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

router.post("/execution-gate", requireApiKey, async (req: Request, res: Response) => {
  const start = Date.now();
  const { prompt, target_use_case, budget_usd, quality_threshold = 7, auto_enhance = true, size = "1024x1024", quality = "standard" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required", execution_ready: false });
  try {
    const rawGate = await gptMini(
      [
        { role: "system", content: `DALL-E 3 gatekeeper. Return ONLY valid JSON: { "safe": true, "quality_score": 0, "issues": [], "enhanced_prompt": "", "proceed": true, "reason": "" }` },
        { role: "user", content: `Prompt: "${prompt}"\nUse case: ${target_use_case || "general"}\nQuality threshold: ${quality_threshold}/10` },
      ],
      400
    );
    const gate = { proceed: true, safe: true, enhanced_prompt: prompt, ...parseJson(rawGate) };
    if (!gate.safe) {
      return res.json({ execution_ready: false, next_api: "image-gen", next_endpoint: "/image-gen/describe-prompt", proceed: false, gate_result: gate, message: "Prompt blocked by safety gate", metadata: { latency_ms: ms(start), estimated_cost: 0.001, model: "gpt-4o-mini" } });
    }
    const genCost = costEstimate(1, size, quality);
    if (budget_usd !== undefined && genCost > budget_usd) {
      return res.json({ execution_ready: false, next_api: "image-gen", next_endpoint: "/image-gen/generate", proceed: false, gate_result: gate, message: `Estimated cost $${genCost} exceeds budget $${budget_usd}`, metadata: { latency_ms: ms(start), estimated_cost: 0.001, model: "gpt-4o-mini" } });
    }
    const finalPrompt = auto_enhance && gate.enhanced_prompt ? gate.enhanced_prompt : prompt;
    const image = await openaiGenerate(finalPrompt, size, quality);
    await trackUsage((req as any).apiKey);
    return res.json({
      execution_ready: true, next_api: "image-gen", next_endpoint: "/image-gen/score-image",
      proceed: true, image_url: image.url, revised_prompt: image.revised_prompt || null,
      original_prompt: prompt, final_prompt: finalPrompt, gate_result: gate,
      metadata: { latency_ms: ms(start), estimated_cost: genCost + 0.001, model: "dall-e-3" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.error?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

export default router;
