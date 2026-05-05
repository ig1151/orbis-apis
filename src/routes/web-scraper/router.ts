import { Router, Request, Response } from "express";
import axios from "axios";
import Redis from "ioredis";

const router = Router();

// ─── Redis ────────────────────────────────────────────────────────────────────
let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "");
    redisClient.on("error", (e: Error) => console.error("[web-scraper] redis error:", e));
  }
  return redisClient;
}

// ─── Tavily ───────────────────────────────────────────────────────────────────
const TAVILY_BASE = "https://api.tavily.com";

async function tavilyExtract(urls: string[]): Promise<Array<{ url: string; raw_content: string; title?: string }>> {
  const r = await axios.post(
    `${TAVILY_BASE}/extract`,
    { urls },
    { headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, "Content-Type": "application/json" }, timeout: 20000 }
  );
  return r.data.results ?? [];
}

async function tavilySearch(query: string, maxResults = 5): Promise<Array<{ title: string; url: string; content: string }>> {
  const r = await axios.post(
    `${TAVILY_BASE}/search`,
    { query, max_results: maxResults, search_depth: "basic" },
    { headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, "Content-Type": "application/json" }, timeout: 12000 }
  );
  return (r.data.results ?? []).map((x: { title: string; url: string; content?: string }) => ({
    title: x.title, url: x.url, content: x.content ?? "",
  }));
}

async function gptMini(messages: object[], maxTokens = 500): Promise<string> {
  const r = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    { model: "gpt-4o-mini", messages, max_tokens: maxTokens },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
  );
  return r.data.choices[0].message.content.trim();
}

function parseJson(raw: string): any {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return {}; }
}

const ms = (start: number) => Date.now() - start;

// ─── POST /scrape ─────────────────────────────────────────────────────────────
router.post("/scrape", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url, format = "markdown", summarize = false } = req.body;
  if (!url) return res.status(400).json({ error: "url is required", execution_ready: false });

  try {
    const results = await tavilyExtract([url]);
    const page = results[0] ?? { url, raw_content: "", title: "" };
    const wordCount = page.raw_content.split(/\s+/).filter(Boolean).length;

    let summary: string | null = null;
    if (summarize && page.raw_content) {
      summary = await gptMini(
        [{ role: "system", content: "Summarize this web page content concisely in 3-5 sentences. Return only the summary." },
         { role: "user", content: page.raw_content.slice(0, 4000) }],
        300
      );
    }

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/extract-structured",
      url: page.url,
      title: page.title ?? null,
      content: page.raw_content,
      format,
      word_count: wordCount,
      summary: summary ?? null,
      metadata: { latency_ms: ms(start), estimated_cost: 0.005, source: "tavily" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /scrape-batch ───────────────────────────────────────────────────────
router.post("/scrape-batch", async (req: Request, res: Response) => {
  const start = Date.now();
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: "urls array is required", execution_ready: false });
  if (urls.length > 5) return res.status(400).json({ error: "Max 5 URLs per batch", execution_ready: false });

  try {
    const results = await tavilyExtract(urls);
    const pages = results.map((p: { url: string; raw_content: string; title?: string }) => ({
      url: p.url,
      title: p.title ?? null,
      content: p.raw_content,
      word_count: p.raw_content.split(/\s+/).filter(Boolean).length,
      success: !!p.raw_content,
    }));

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/extract-structured",
      pages,
      summary: { total: urls.length, success: pages.filter((p: { success: boolean }) => p.success).length },
      metadata: { latency_ms: ms(start), estimated_cost: 0.005 * urls.length, source: "tavily" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /search ─────────────────────────────────────────────────────────────
router.post("/search", async (req: Request, res: Response) => {
  const start = Date.now();
  const { query, max_results = 5 } = req.body;
  if (!query) return res.status(400).json({ error: "query is required", execution_ready: false });

  try {
    const results = await tavilySearch(query, Math.min(max_results, 10));
    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/extract-structured",
      query,
      results,
      total: results.length,
      metadata: { latency_ms: ms(start), estimated_cost: 0.005, source: "tavily" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.response?.data?.message || err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /extract-structured ─────────────────────────────────────────────────
router.post("/extract-structured", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url, schema, content } = req.body;
  if (!url && !content) return res.status(400).json({ error: "url or content is required", execution_ready: false });

  try {
    let pageContent = content;
    if (!pageContent) {
      const results = await tavilyExtract([url]);
      pageContent = results[0]?.raw_content ?? "";
    }

    const schemaDesc = schema ? JSON.stringify(schema) : "title, description, main_points (array), key_facts (array), author, date_published, category";
    const extracted = parseJson(await gptMini(
      [{ role: "system", content: `Extract structured data from web content. Return ONLY valid JSON matching this schema: ${schemaDesc}` },
       { role: "user", content: pageContent.slice(0, 6000) }],
      600
    ));

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/summarize",
      url: url ?? null,
      extracted,
      metadata: { latency_ms: ms(start), estimated_cost: 0.006, model: "gpt-4o-mini" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /summarize ──────────────────────────────────────────────────────────
router.post("/summarize", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url, content, max_length = 200 } = req.body;
  if (!url && !content) return res.status(400).json({ error: "url or content is required", execution_ready: false });

  try {
    let pageContent = content;
    let title: string | null = null;
    if (!pageContent) {
      const results = await tavilyExtract([url]);
      pageContent = results[0]?.raw_content ?? "";
      title = results[0]?.title ?? null;
    }

    const rawSummary = parseJson(await gptMini(
      [{ role: "system", content: `Summarize this web page. Return ONLY valid JSON: { "summary": "...", "key_points": ["..."], "sentiment": "positive|negative|neutral", "category": "..." }` },
       { role: "user", content: `Max length: ${max_length} words.\n\n${pageContent.slice(0, 5000)}` }],
      400
    ));

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/execution-gate",
      url: url ?? null,
      title,
      ...rawSummary,
      metadata: { latency_ms: ms(start), estimated_cost: 0.002, model: "gpt-4o-mini" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /detect-change ──────────────────────────────────────────────────────
router.post("/detect-change", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required", execution_ready: false });

  try {
    const redis = getRedis();
    const cacheKey = `web-scraper:snapshot:${Buffer.from(url).toString("base64").slice(0, 40)}`;
    const cached = await redis.get(cacheKey);

    const results = await tavilyExtract([url]);
    const current = results[0]?.raw_content ?? "";
    const currentHash = Buffer.from(current).length;

    let changed = false;
    let delta: any = null;

    if (cached) {
      const prev = JSON.parse(cached);
      changed = prev.hash !== currentHash;
      if (changed) {
        delta = parseJson(await gptMini(
          [{ role: "system", content: "Compare two versions of web page content and describe what changed. Return ONLY valid JSON: { \"changes\": [\"...\"], \"change_type\": \"content|price|availability|structural\", \"significance\": \"high|medium|low\" }" },
           { role: "user", content: `Previous:\n${prev.content.slice(0, 2000)}\n\nCurrent:\n${current.slice(0, 2000)}` }],
          300
        ));
      }
    }

    await redis.set(cacheKey, JSON.stringify({ hash: currentHash, content: current, url, cached_at: new Date().toISOString() }), "EX", 60 * 60 * 24);

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: changed ? "/web-scraper/execution-gate" : "/web-scraper/monitor-source",
      url,
      changed,
      first_check: !cached,
      delta,
      metadata: { latency_ms: ms(start), estimated_cost: changed ? 0.007 : 0.005, source: "tavily" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /monitor-source ─────────────────────────────────────────────────────
router.post("/monitor-source", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url, alert_on = ["content", "price", "availability"], webhook_url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required", execution_ready: false });

  try {
    const redis = getRedis();
    const monitorKey = `web-scraper:monitor:${Buffer.from(url).toString("base64").slice(0, 40)}`;
    const record = { url, alert_on, webhook_url: webhook_url ?? null, registered_at: new Date().toISOString(), active: true };
    await redis.set(monitorKey, JSON.stringify(record), "EX", 60 * 60 * 24 * 30);

    return res.json({
      execution_ready: true,
      next_api: "web-scraper",
      next_endpoint: "/web-scraper/detect-change",
      url,
      monitoring: true,
      alert_on,
      webhook_url: webhook_url ?? null,
      message: "URL registered for monitoring. Call /detect-change periodically to check for updates.",
      metadata: { latency_ms: ms(start), estimated_cost: 0.001 },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── POST /execution-gate ─────────────────────────────────────────────────────
router.post("/execution-gate", async (req: Request, res: Response) => {
  const start = Date.now();
  const { url, content, goal, threshold = 7 } = req.body;
  if (!url && !content) return res.status(400).json({ error: "url or content is required", execution_ready: false });

  try {
    let pageContent = content;
    if (!pageContent) {
      const results = await tavilyExtract([url]);
      pageContent = results[0]?.raw_content ?? "";
    }

    const gate = parseJson(await gptMini(
      [{ role: "system", content: `You are an agent execution gatekeeper. Evaluate web content and decide if an agent should act. Return ONLY valid JSON: { "proceed": true|false, "confidence": 1-10, "reason": "...", "recommended_action": "...", "risk_level": "high|medium|low", "key_signals": ["..."] }` },
       { role: "user", content: `Goal: ${goal || "extract and act on key information"}\nThreshold: ${threshold}/10\n\nContent:\n${pageContent.slice(0, 4000)}` }],
      400
    ));

    return res.json({
      execution_ready: gate.proceed ?? false,
      next_api: gate.proceed ? "web-scraper" : "web-scraper",
      next_endpoint: gate.proceed ? "/web-scraper/extract-structured" : "/web-scraper/monitor-source",
      url: url ?? null,
      ...gate,
      metadata: { latency_ms: ms(start), estimated_cost: 0.003, model: "gpt-4o-mini" },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, execution_ready: false, metadata: { latency_ms: ms(start) } });
  }
});

// ─── GET /openapi.json ────────────────────────────────────────────────────────
router.get("/openapi.json", (_req, res) => {
  res.json({
    openapi: "3.0.0",
    info: { title: "Web Scraper & Intelligence API", version: "2.0.0", description: "Agent-native web scraping, structured extraction, change detection, source monitoring, and execution gating via Tavily." },
    servers: [{ url: "https://orbis-apis.onrender.com/web-scraper" }],
    paths: {
      "/scrape":              { post: { summary: "Scrape a single URL and return clean content" } },
      "/scrape-batch":        { post: { summary: "Scrape up to 5 URLs in parallel" } },
      "/search":              { post: { summary: "Search the web and return content" } },
      "/extract-structured":  { post: { summary: "Extract schema-based structured data from a URL or content" } },
      "/summarize":           { post: { summary: "Summarize web page content with key points and sentiment" } },
      "/detect-change":       { post: { summary: "Detect content changes vs cached baseline" } },
      "/monitor-source":      { post: { summary: "Register a URL for change monitoring" } },
      "/execution-gate":      { post: { summary: "Gate agent execution based on web content analysis" } },
    },
  });
});

export default router;
