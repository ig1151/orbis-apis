import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Financial News Monitor API',
      version: '1.0.0',
      description: 'Analyze financial news sentiment, extract ticker mentions, score market impact, detect breaking events, track trending themes, and generate trading signals from news articles.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/financial-news-monitor' }],
    paths: {
      '/analyze-sentiment': {
        post: {
          operationId: 'analyzeSentiment',
          summary: 'Score financial news sentiment by ticker and sector with bullish/bearish themes and market-moving probability',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {}, ticker: { type: 'string' }, sector: { type: 'string' } } } } } },
          responses: { '200': { description: 'Sentiment analysis', content: { 'application/json': { schema: { type: 'object', properties: { overall_sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] }, sentiment_score: { type: 'number' }, sentiment_by_ticker: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, score: { type: 'number' }, article_count: { type: 'number' } } } }, key_bullish_themes: actions, key_bearish_themes: actions, market_moving_probability: { type: 'string', enum: ['high', 'medium', 'low'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/extract-tickers': {
        post: {
          operationId: 'extractTickers',
          summary: 'Extract all stock tickers, companies, indices, and macro entities mentioned in news articles',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {} } } } } },
          responses: { '200': { description: 'Ticker extraction', content: { 'application/json': { schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, company_name: { type: 'string' }, mention_count: { type: 'number' }, context: { type: 'string', enum: ['positive', 'negative', 'neutral'] } } } }, primary_ticker: { type: 'string' }, sector_mentions: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, mention_count: { type: 'number' } } } }, total_tickers_found: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Extraction failed' } },
        },
      },
      '/score-impact': {
        post: {
          operationId: 'scoreImpact',
          summary: 'Score the potential market impact of a news article with price direction, magnitude, and trade signal',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['article'], properties: { article: {}, ticker: { type: 'string' } } } } } },
          responses: { '200': { description: 'Market impact score', content: { 'application/json': { schema: { type: 'object', properties: { impact_score: { type: 'number' }, impact_level: { type: 'string', enum: ['very_high', 'high', 'medium', 'low', 'minimal'] }, price_direction: { type: 'string', enum: ['up', 'down', 'sideways', 'uncertain'] }, magnitude_estimate_pct: { type: 'number' }, catalyst_type: { type: 'string', enum: ['earnings', 'guidance', 'macro', 'regulatory', 'M&A', 'analyst', 'insider', 'sector'] }, trade_signal: { type: 'string', enum: ['buy', 'sell', 'hold', 'avoid'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing article' }, '500': { description: 'Scoring failed' } },
        },
      },
      '/detect-events': {
        post: {
          operationId: 'detectEvents',
          summary: 'Detect significant financial events, M&A activity, regulatory actions, and breaking developments in news',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {} } } } } },
          responses: { '200': { description: 'Detected events', content: { 'application/json': { schema: { type: 'object', properties: { events: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, type: { type: 'string', enum: ['earnings', 'M&A', 'regulatory', 'macro', 'leadership', 'guidance', 'lawsuit', 'product', 'partnership'] }, tickers_affected: actions, significance: { type: 'string', enum: ['high', 'medium', 'low'] }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] } } } }, breaking_events: actions, market_moving_events: actions, total_events: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Detection failed' } },
        },
      },
      '/trending-topics': {
        post: {
          operationId: 'trendingTopics',
          summary: 'Identify trending financial themes, dominant narratives, and sector-level sentiment shifts in news',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {}, timeframe: { type: 'string' } } } } } },
          responses: { '200': { description: 'Trending topics', content: { 'application/json': { schema: { type: 'object', properties: { trending_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, mention_count: { type: 'number' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, momentum: { type: 'string', enum: ['rising', 'stable', 'fading'] } } } }, dominant_narrative: { type: 'string' }, emerging_themes: actions, fading_themes: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/compare-sources': {
        post: {
          operationId: 'compareSources',
          summary: 'Compare sentiment and coverage across news sources to identify consensus, divergence, and contrarian signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {}, topic: { type: 'string' } } } } } },
          responses: { '200': { description: 'Source comparison', content: { 'application/json': { schema: { type: 'object', properties: { sources: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, credibility_tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3'] } } } }, consensus_view: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, contrarian_signals: actions, sentiment_dispersion: { type: 'string', enum: ['high', 'medium', 'low'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Comparison failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate news input readiness and recommend the best analysis endpoint',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {}, ticker: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution readiness', content: { 'application/json': { schema: { type: 'object', properties: { execution_ready: { type: 'boolean' }, article_count: { type: 'number' }, recommended_endpoint: { type: 'string' }, next_api: { type: 'string' }, blocking_flags: actions, privacy } } } } }, '400': { description: 'Missing articles' } },
        },
      },
      '/monitor': {
        post: {
          operationId: 'monitorNews',
          summary: 'ONE-CALL: full news intelligence — sentiment, tickers, events, trends, and trading signals in one response',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: {}, ticker: { type: 'string' }, portfolio_tickers: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'Complete financial news intelligence', content: { 'application/json': { schema: { type: 'object', properties: { overall_sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] }, sentiment_score: { type: 'number' }, top_tickers: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, breaking_events: actions, dominant_narrative: { type: 'string' }, trading_signals: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, signal: { type: 'string', enum: ['buy', 'sell', 'hold', 'avoid'] }, rationale: { type: 'string' }, confidence: { type: 'number' } } } }, one_line_summary: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing articles' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
