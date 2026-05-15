import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const provenance = { type: 'object', properties: { source: { type: 'string' }, extraction_method: { type: 'string' }, data_as_of: { type: 'string' }, confidence: { type: 'number' } } };

const articlesSchema = {
  oneOf: [
    { type: 'string', description: 'Raw article text or JSON string of articles array' },
    {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          source: { type: 'string', description: 'Publication name, e.g. Reuters, Bloomberg' },
          url: { type: 'string', format: 'uri' },
          published_at: { type: 'string', format: 'date-time' },
          author: { type: 'string' },
        },
      },
      description: 'Array of structured article objects',
    },
  ],
  description: 'News articles to analyze — raw text or structured array',
};

const articleSchema = {
  oneOf: [
    { type: 'string', description: 'Raw article text' },
    { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, source: { type: 'string' }, url: { type: 'string', format: 'uri' }, published_at: { type: 'string', format: 'date-time' } }, description: 'Structured article object' },
  ],
};

const baseResponse = {
  trace_id: { type: 'string', description: 'Unique request trace ID for debugging and audit' },
  execution_id: { type: 'string', description: 'Execution ID for workflow chaining' },
  computed_at: { type: 'string', format: 'date-time' },
  provenance,
  privacy,
  confidence_per_section: confidence,
  recommended_actions_priority_order: actions,
  disclaimer: { type: 'string', description: 'Informational only. Not financial advice.' },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Financial News Monitor API',
      version: '1.0.0',
      description: 'Analyze financial news sentiment, extract ticker mentions, score market impact, detect breaking events, track trending themes, and generate trading signals from news articles.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x-financial-disclaimer': 'Informational only. Not financial advice. Trading signals are not recommendations to buy or sell securities.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/financial-news-monitor' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'getDiscovery',
          summary: 'API discovery — returns name, info URL, openapi URL, and health status',
          security: [],
          responses: { '200': { description: 'Discovery info', content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, info: { type: 'string' }, openapi: { type: 'string' }, health: { type: 'string' } } } } } } },
        },
      },
      '/analyze-sentiment': {
        post: {
          operationId: 'analyzeSentiment',
          summary: 'Score financial news sentiment by ticker and sector with bullish/bearish themes and market-moving probability',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema, ticker: { type: 'string', description: 'Filter analysis to a specific ticker, e.g. AAPL' }, sector: { type: 'string', description: 'Filter analysis to a specific sector, e.g. Technology' } } } } } },
          responses: { '200': { description: 'Sentiment analysis', content: { 'application/json': { schema: { type: 'object', properties: { overall_sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] }, sentiment_score: { type: 'number', description: '-100 (very bearish) to 100 (very bullish)' }, sentiment_by_ticker: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, score: { type: 'number' }, article_count: { type: 'number' } } } }, sentiment_by_sector: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, score: { type: 'number' } } } }, sentiment_shift: { type: 'string', enum: ['improving', 'stable', 'deteriorating'] }, key_bullish_themes: actions, key_bearish_themes: actions, news_volume_signal: { type: 'string', enum: ['high', 'normal', 'low'] }, market_moving_probability: { type: 'string', enum: ['high', 'medium', 'low'] }, source_coverage: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, article_count: { type: 'number' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, credibility_tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3'] } } } }, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/extract-tickers': {
        post: {
          operationId: 'extractTickers',
          summary: 'Extract all stock tickers, companies, indices, and macro entities mentioned in news articles',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema } } } } },
          responses: { '200': { description: 'Ticker extraction results', content: { 'application/json': { schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, company_name: { type: 'string' }, mention_count: { type: 'number' }, context: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, exchanges: actions } } }, primary_ticker: { type: 'string' }, sector_mentions: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, mention_count: { type: 'number' } } } }, index_mentions: actions, macro_entities: actions, commodities: actions, total_tickers_found: { type: 'number' }, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Extraction failed' } },
        },
      },
      '/score-impact': {
        post: {
          operationId: 'scoreImpact',
          summary: 'Score the potential market impact of a news article with price direction, magnitude estimate, and trade signal',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['article'], properties: { article: articleSchema, ticker: { type: 'string', description: 'Primary ticker to score impact for' } } } } } },
          responses: { '200': { description: 'Market impact score', content: { 'application/json': { schema: { type: 'object', properties: { impact_score: { type: 'number', description: '0 (no impact) to 100 (high impact)' }, impact_level: { type: 'string', enum: ['very_high', 'high', 'medium', 'low', 'minimal'] }, price_direction: { type: 'string', enum: ['up', 'down', 'sideways', 'uncertain'] }, magnitude_estimate_pct: { type: 'number' }, time_horizon: { type: 'string', enum: ['intraday', '1-3 days', '1-2 weeks', 'longer-term'] }, catalyst_type: { type: 'string', enum: ['earnings', 'guidance', 'macro', 'regulatory', 'M&A', 'analyst', 'insider', 'sector'] }, affected_tickers: actions, affected_sectors: actions, counterpoints: actions, trade_signal: { type: 'string', enum: ['buy', 'sell', 'hold', 'avoid'] }, source_credibility: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'unknown'] }, article_recency: { type: 'string', description: 'How recent the article is' }, ...baseResponse } } } } }, '400': { description: 'Missing article' }, '500': { description: 'Scoring failed' } },
        },
      },
      '/detect-events': {
        post: {
          operationId: 'detectEvents',
          summary: 'Detect significant financial events, M&A activity, regulatory actions, and breaking developments in news',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema } } } } },
          responses: { '200': { description: 'Detected financial events', content: { 'application/json': { schema: { type: 'object', properties: { events: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, type: { type: 'string', enum: ['earnings', 'M&A', 'regulatory', 'macro', 'leadership', 'guidance', 'lawsuit', 'product', 'partnership'] }, tickers_affected: actions, significance: { type: 'string', enum: ['high', 'medium', 'low'] }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, confirmed: { type: 'boolean' }, summary: { type: 'string' }, source: { type: 'string' }, published_at: { type: 'string', format: 'date-time' } } } }, breaking_events: actions, scheduled_events: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, date: { type: 'string' }, tickers: actions } } }, rumor_events: actions, total_events: { type: 'number' }, market_moving_events: actions, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Detection failed' } },
        },
      },
      '/trending-topics': {
        post: {
          operationId: 'trendingTopics',
          summary: 'Identify trending financial themes, dominant narratives, and sector-level sentiment shifts across news',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema, timeframe: { type: 'string', description: 'Timeframe label for context, e.g. 24h, 7d', default: '24h' } } } } } },
          responses: { '200': { description: 'Trending financial topics', content: { 'application/json': { schema: { type: 'object', properties: { trending_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, mention_count: { type: 'number' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, related_tickers: actions, momentum: { type: 'string', enum: ['rising', 'stable', 'fading'] } } } }, dominant_narrative: { type: 'string' }, emerging_themes: actions, fading_themes: actions, macro_themes: actions, sector_themes: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, theme: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] } } } }, narrative_shift: { type: 'boolean' }, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/compare-sources': {
        post: {
          operationId: 'compareSources',
          summary: 'Compare sentiment and coverage bias across news sources to identify consensus, divergence, and contrarian signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema, topic: { type: 'string', description: 'Optional topic to focus the comparison on' } } } } } },
          responses: { '200': { description: 'Source comparison', content: { 'application/json': { schema: { type: 'object', properties: { sources: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, article_count: { type: 'number' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, bias_direction: { type: 'string', enum: ['optimistic', 'neutral', 'pessimistic'] }, credibility_tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3'] }, source_url: { type: 'string', format: 'uri' } } } }, consensus_view: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, divergent_views: actions, sentiment_dispersion: { type: 'string', enum: ['high', 'medium', 'low'] }, most_cited_source: { type: 'string' }, contrarian_signals: actions, information_gaps: actions, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Comparison failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate news input readiness and recommend the best analysis endpoint before processing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema, ticker: { type: 'string', description: 'Optional ticker filter' } } } } } },
          responses: { '200': { description: 'Execution readiness check', content: { 'application/json': { schema: { type: 'object', properties: { execution_ready: { type: 'boolean' }, ticker: { type: 'string' }, article_count: { type: 'number' }, recommended_endpoint: { type: 'string' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, blocking_flags: actions, flag_definitions: { type: 'object', additionalProperties: { type: 'string' } }, ...baseResponse } } } } }, '400': { description: 'Missing articles' } },
        },
      },
      '/monitor': {
        post: {
          operationId: 'monitorNews',
          summary: 'ONE-CALL: full news intelligence — sentiment, tickers, events, trends, and trading signals in one response',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: articlesSchema, ticker: { type: 'string', description: 'Primary ticker to focus analysis on' }, portfolio_tickers: { type: 'array', items: { type: 'string' }, description: 'List of portfolio tickers to monitor' } } } } } },
          responses: { '200': { description: 'Complete financial news intelligence report', content: { 'application/json': { schema: { type: 'object', properties: { overall_sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] }, sentiment_score: { type: 'number' }, top_tickers: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, breaking_events: actions, dominant_narrative: { type: 'string' }, market_moving_news: actions, trading_signals: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, signal: { type: 'string', enum: ['buy', 'sell', 'hold', 'avoid'] }, rationale: { type: 'string' }, confidence: { type: 'number' }, source_count: { type: 'number' } } } }, risk_flags: actions, watch_list_additions: actions, sentiment_shift: { type: 'string', enum: ['improving', 'stable', 'deteriorating'] }, one_line_summary: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
