import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function fetchPageContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrbisBot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

async function callClaude(prompt: string, maxTokens = 1200): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }
  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content ?? '{}';
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { raw };
  }
}

interface CacheEntry { content: string; snapshot: string; ts: number; }
const pageCache = new Map<string, CacheEntry>();

router.post('/extract-entities', async (req: Request, res: Response) => {
  const { url, text } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an entity extraction engine. Extract all named entities from the content below.
Return ONLY a valid JSON object with these keys:
- people: array of {name, role, context}
- companies: array of {name, type, context}
- prices: array of {value, currency, context}
- events: array of {name, date, context}
- locations: array of {name, type}
- topics: array of strings
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-entities', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-entities', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-signals', async (req: Request, res: Response) => {
  const { url, text, context } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an intelligence signal extractor. Identify actionable signals in the content below.
${context ? `Context/goal: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- signals: array of {signal, type, strength (high|medium|low), action, confidence (0-1)}
  signal types: hiring | funding | partnership | product_launch | regulatory | competitive | market | sentiment
- summary: string (1-2 sentences)
- alert_level: high | medium | low
- recommended_action: string
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-signals', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-signals', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/detect-change', async (req: Request, res: Response) => {
  const { url, baseline } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const current = await fetchPageContent(url);
    const cached = pageCache.get(url);
    const previous = baseline ?? cached?.snapshot ?? null;
    pageCache.set(url, { content: current, snapshot: current.slice(0, 3000), ts: Date.now() });
    if (!previous) {
      res.json({ endpoint: 'detect-change', url, changed: false, message: 'Baseline captured. Call again to detect changes.', cached_at: new Date().toISOString(), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
      return;
    }
    const raw = await callClaude(`You are a page change detection engine. Compare these two versions of a webpage and identify what changed.
Return ONLY a valid JSON object with these keys:
- changed: boolean
- change_type: none | minor | significant | critical
- changes: array of {field, old_value, new_value, significance (high|medium|low)}
- summary: string (1-2 sentences describing what changed)
- alert_level: none | low | medium | high
PREVIOUS VERSION:
"""
${previous.slice(0, 5000)}
"""
CURRENT VERSION:
"""
${current.slice(0, 5000)}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'detect-change', url, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'detect-change', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/monitor-page', async (req: Request, res: Response) => {
  const { url, watch_for, webhook_url } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const content = await fetchPageContent(url);
    const alreadyCached = pageCache.has(url);
    pageCache.set(url, { content, snapshot: content.slice(0, 3000), ts: Date.now() });
    const raw = await callClaude(`You are a page monitoring setup engine. Analyze this page and define what should be monitored.
${watch_for ? `The user wants to watch for: ${watch_for}` : ''}
Return ONLY a valid JSON object with these keys:
- monitor_id: string (slug based on url)
- watch_targets: array of {target, type, current_value, change_trigger}
  types: price | text | presence | count | status | any
- check_frequency_recommendation: string (e.g. "every 15 minutes")
- current_state_summary: string
- status: active
Content:
"""
${content}
"""
Return only the JSON object:`);
    const data = parseJson(raw) as Record<string, unknown>;
    data.webhook_url = webhook_url ?? null;
    data.webhook_configured = !!webhook_url;
    data.registered_at = new Date().toISOString();
    data.baseline_captured = true;
    data.previously_registered = alreadyCached;
    res.json({ endpoint: 'monitor-page', url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-page', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-opportunities', async (req: Request, res: Response) => {
  const { url, text, context } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an opportunity intelligence engine. Surface actionable opportunities from the content below.
${context ? `Context/goal: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- opportunities: array of {title, type (sales|partnership|investment|hiring|market_gap|competitive|content|other), description, urgency (high|medium|low), effort (high|medium|low), potential_value (high|medium|low), action, confidence (0-1)}
- top_opportunity: string (title of the best one)
- summary: string (1-2 sentences)
- total_found: number
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-opportunities', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-opportunities', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/monitor-topic', async (req: Request, res: Response) => {
  const { topic, urls, context } = req.body;
  if (!topic) { res.status(400).json({ error: 'Provide topic' }); return; }
  const start = Date.now();
  try {
    const sources: string[] = urls ?? [];
    const contentBlocks: string[] = [];
    for (const url of sources.slice(0, 5)) {
      try {
        const content = await fetchPageContent(url);
        contentBlocks.push(`SOURCE: ${url}\n${content.slice(0, 2000)}`);
      } catch {
        contentBlocks.push(`SOURCE: ${url}\n[Failed to fetch]`);
      }
    }
    const sourceText = contentBlocks.length > 0 ? contentBlocks.join('\n\n---\n\n') : `No sources provided. Analyze topic: "${topic}" based on general knowledge.`;
    const raw = await callClaude(`You are a topic intelligence monitor. Analyze the sources below for the topic: "${topic}".
${context ? `Context: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- topic: string
- signals: array of {source_url, signal, type, strength (high|medium|low), quote}
- sentiment: positive | neutral | negative | mixed
- trend: rising | stable | declining | emerging
- narrative_summary: string (2-3 sentences)
- key_actors: array of strings
- alert_level: high | medium | low
- recommended_action: string
- sources_analyzed: number
Sources:
"""
${sourceText}
"""
Return only the JSON object:`, 1500);
    res.json({ endpoint: 'monitor-topic', topic, urls: sources, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-topic', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
