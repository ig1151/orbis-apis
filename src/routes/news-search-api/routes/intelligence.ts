import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();
const PROVIDER = 'google-news';

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

// Hardened HTTP GET: 15s timeout + bounded retry (2x) on 429/5xx/timeout/network.
// Transient upstream failures degrade to a caught error (→ 200 success:false), never a hang/500.
async function httpGet(url: string): Promise<string> {
  const MAX_RETRIES = 2;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
        responseType: 'text',
      });
      return typeof res.data === 'string' ? res.data : String(res.data);
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = !status || status === 429 || status >= 500 || e?.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && retryable) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

// Decode the handful of HTML entities Google News emits in titles/descriptions.
function decodeEntities(s: string): string {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)))
    .trim();
}

// Strip HTML tags from the RSS <description> snippet, leaving plain text.
function stripHtml(html: string): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

// Convert RFC-822 pubDate (e.g. "Tue, 09 Jun 2026 16:37:19 GMT") to ISO-8601.
function toIso(pubDate: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

interface Article {
  title: string;
  source: string | null;
  published_at: string | null;
  url: string;
  summary: string;
  // Fields the RSS feed cannot provide are returned null (never fabricated).
  sentiment: null;
  category: null;
  relevance_score: null;
}

// Parse Google News RSS XML into real articles. Title carries a " - Publisher" suffix;
// <source> gives the clean publisher when present.
function parseRss(xml: string, limit: number): Article[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: Article[] = [];
  $('item').each((_i, el) => {
    if (out.length >= limit) return;
    const item = $(el);
    let title = decodeEntities(item.find('title').first().text());
    const link = item.find('link').first().text().trim();
    const pubDate = item.find('pubDate').first().text().trim();
    const source = decodeEntities(item.find('source').first().text()) || null;
    const description = item.find('description').first().text();
    if (!title || !link) return;
    // Strip the trailing " - <Publisher>" the feed appends to titles when we know the source.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, title.length - (` - ${source}`).length).trim();
    }
    out.push({
      title,
      source,
      published_at: toIso(pubDate),
      url: link,
      summary: stripHtml(description),
      sentiment: null,
      category: null,
      relevance_score: null,
    });
  });
  return out;
}

const SEARCH_URL = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const TOP_HEADLINES_URL = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';

const DATA_NOTE =
  'sentiment, category and relevance_score are null: Google News RSS does not provide these fields and they are not fabricated.';

function upstreamError(res: Response, e: any) {
  // Never 500, never hang: degrade to a 200 with a structured retryable error.
  return res.status(200).json({
    success: false,
    error: 'upstream_unavailable',
    detail: e?.message || 'failed to fetch Google News RSS',
    retryable: true,
    provider: PROVIDER,
  });
}

// Compute top sources from real parsed articles (ordered by frequency).
function topSources(articles: Article[]): string[] {
  const counts = new Map<string, number>();
  for (const a of articles) {
    if (a.source) counts.set(a.source, (counts.get(a.source) || 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([s]) => s);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'News Search API', info: '/news-search/info', openapi: '/news-search/openapi.json', health: 'ok' });
});

// POST /latest — recent articles for `query`, or general top headlines if no query.
router.post('/latest', async (req: Request, res: Response) => {
  const { limit = 10, query } = req.body || {};
  const max = Math.max(1, Math.min(Number(limit) || 10, 50));
  try {
    const url = query ? SEARCH_URL(String(query)) : TOP_HEADLINES_URL;
    const xml = await httpGet(url);
    const articles = parseRss(xml, max);
    res.status(200).json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      provider: PROVIDER,
      source_type: 'live_api_call',
      query: query || null,
      articles,
      total: articles.length,
      data_note: DATA_NOTE,
      confidence_per_section: { articles: 1.0 },
      recommended_actions_priority_order: [
        'filter by sentiment for risk signals',
        'pass to knowledge-graph for entity extraction',
        'route to sentiment-api for deeper analysis',
      ],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// POST /by-topic — articles for `topic`.
router.post('/by-topic', async (req: Request, res: Response) => {
  const { topic, limit = 10 } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  const max = Math.max(1, Math.min(Number(limit) || 10, 50));
  try {
    const xml = await httpGet(SEARCH_URL(String(topic)));
    const articles = parseRss(xml, max);
    res.status(200).json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      provider: PROVIDER,
      source_type: 'live_api_call',
      topic,
      articles,
      total: articles.length,
      // Cannot be derived from RSS headlines without fabricating sentiment.
      topic_sentiment_trend: null,
      top_sources: topSources(articles),
      data_note: DATA_NOTE + ' topic_sentiment_trend is null for the same reason.',
      confidence_per_section: { articles: 1.0, topic_sentiment_trend: null },
      recommended_actions_priority_order: [
        'track topic sentiment over time',
        'identify key entities for graph analysis',
        'alert on negative sentiment spikes',
      ],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// POST /by-company — articles for `company` (query the company name, quoted for precision).
router.post('/by-company', async (req: Request, res: Response) => {
  const { company, limit = 10 } = req.body || {};
  if (!company) return res.status(400).json({ error: 'company is required' });
  const max = Math.max(1, Math.min(Number(limit) || 10, 50));
  try {
    const xml = await httpGet(SEARCH_URL(`"${String(company)}"`));
    const articles = parseRss(xml, max);
    res.status(200).json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      provider: PROVIDER,
      source_type: 'live_api_call',
      company,
      articles,
      total: articles.length,
      company_news_summary: {
        // Derived only from real RSS data; sentiment/themes/risk cannot be inferred without fabrication.
        overall_sentiment: null,
        key_themes: null,
        risk_signals: null,
        recent_events: articles.map(a => a.title),
        top_sources: topSources(articles),
      },
      data_note: DATA_NOTE + ' overall_sentiment, key_themes and risk_signals are null; recent_events lists the real article titles.',
      confidence_per_section: { articles: 1.0, company_news_summary: null },
      recommended_actions_priority_order: [
        'monitor for reputation risks',
        'use for competitive intelligence',
        'cross-reference with due-diligence API',
      ],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

// POST /execution-gate — unchanged gate logic; provider/source reflect the real feed.
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { query, topic, company, objective } = req.body || {};
  const hasInput = query || topic || company;
  const flags: string[] = [];
  if (!hasInput) flags.push('NO_SEARCH_INPUT');
  res.status(200).json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    provider: PROVIDER,
    source_type: 'live_api_call',
    execution_ready: flags.length === 0,
    input: query || topic || company || null,
    objective: objective || 'news_intelligence',
    next_api: 'sentiment-api',
    next_endpoint: '/analyze',
    blocking_flags: flags,
    flag_definitions: { NO_SEARCH_INPUT: 'Provide query, topic, or company to search news' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: [
      'Run /latest for trending signals',
      'Run /by-company for competitive monitoring',
      'Run /by-topic for market intelligence',
    ],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /search (ONE-CALL) — articles for `query`.
router.post('/search', async (req: Request, res: Response) => {
  const { query, limit = 10 } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });
  const max = Math.max(1, Math.min(Number(limit) || 10, 50));
  try {
    const xml = await httpGet(SEARCH_URL(String(query)));
    const articles = parseRss(xml, max);
    res.status(200).json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      provider: PROVIDER,
      source_type: 'live_api_call',
      query,
      articles,
      total: articles.length,
      search_intelligence: {
        // Real, derivable signals only. Sentiment/themes/entities require analysis the feed can't supply.
        overall_sentiment: null,
        sentiment_breakdown: null,
        key_themes: null,
        trending_entities: null,
        risk_signals: null,
        market_signals: null,
        top_sources: topSources(articles),
      },
      // Real metric: distinct publishers / total articles.
      source_diversity_score: articles.length
        ? Number((new Set(articles.map(a => a.source).filter(Boolean)).size / articles.length).toFixed(2))
        : null,
      data_note: DATA_NOTE + ' search_intelligence sentiment/theme/entity fields are null; source_diversity_score and top_sources are computed from real items.',
      confidence_per_section: { articles: 1.0, search_intelligence: null },
      recommended_actions_priority_order: [
        'monitor risk signals for alerts',
        'track trending entities over time',
        'route to knowledge-graph for entity mapping',
      ],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { return upstreamError(res, e); }
});

export default router;
