import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const provenance = { type: 'object', properties: { source: { type: 'string' }, extraction_method: { type: 'string' }, data_as_of: { type: 'string' }, confidence: { type: 'number' } } };

const earningsTextSchema = { type: 'string', description: 'Raw earnings report, press release, or call transcript text' };
const tickerSchema = { type: 'string', description: 'Stock ticker symbol, e.g. AAPL' };

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
      title: 'Earnings Analyzer API',
      version: '1.0.0',
      description: 'Parse earnings reports, extract financial metrics, detect analyst beats/misses, analyze management sentiment, and generate investment signals from earnings data.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x-financial-disclaimer': 'Informational only. Not financial advice. Always verify with primary sources.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/earnings-analyzer' }],
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
      '/analyze-earnings': {
        post: {
          operationId: 'analyzeEarnings',
          summary: 'Analyze full earnings report and extract revenue, EPS, margins, segment performance, and investment signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema, fiscal_period: { type: 'string', description: 'e.g. Q1 2025, FY2024' } } } } } },
          responses: { '200': { description: 'Full earnings analysis', content: { 'application/json': { schema: { type: 'object', properties: { ticker: { type: 'string' }, fiscal_period: { type: 'string' }, revenue: { type: 'object', properties: { reported: { type: 'number' }, unit: { type: 'string' }, yoy_change_pct: { type: 'number' } } }, eps: { type: 'object', properties: { reported: { type: 'number' }, diluted: { type: 'number' }, yoy_change_pct: { type: 'number' } } }, gross_margin_pct: { type: 'number' }, operating_margin_pct: { type: 'number' }, free_cash_flow: { type: 'number' }, key_highlights: actions, segment_performance: { type: 'array', items: { type: 'object', properties: { segment: { type: 'string' }, revenue: { type: 'number' }, growth_pct: { type: 'number' } } } }, analyst_signals: actions, sentiment: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/extract-metrics': {
        post: {
          operationId: 'extractMetrics',
          summary: 'Extract specific financial metrics from earnings text with source quotes and confidence scores',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, metrics: { type: 'array', items: { type: 'string' }, description: 'Metric names to extract, e.g. ["revenue", "EPS", "gross margin"]' } } } } } },
          responses: { '200': { description: 'Extracted metrics', content: { 'application/json': { schema: { type: 'object', properties: { metrics: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, period: { type: 'string' }, source_quote: { type: 'string' }, confidence: { type: 'number' } } } }, metrics_not_found: actions, data_quality: { type: 'string', enum: ['high', 'medium', 'low'] }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Extraction failed' } },
        },
      },
      '/detect-beats-misses': {
        post: {
          operationId: 'detectBeatsMisses',
          summary: 'Detect earnings beats and misses vs consensus estimates with surprise factor and market reaction prediction',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, consensus_estimates: { type: 'object', description: 'Analyst consensus estimates', properties: { revenue: { type: 'number' }, eps: { type: 'number' }, gross_margin_pct: { type: 'number' } } } } } } } },
          responses: { '200': { description: 'Beat/miss analysis', content: { 'application/json': { schema: { type: 'object', properties: { overall_result: { type: 'string', enum: ['beat', 'miss', 'in-line'] }, revenue_result: { type: 'object', properties: { estimate: { type: 'number' }, actual: { type: 'number' }, beat_by_pct: { type: 'number' }, result: { type: 'string', enum: ['beat', 'miss', 'in-line'] } } }, eps_result: { type: 'object', properties: { estimate: { type: 'number' }, actual: { type: 'number' }, beat_by_pct: { type: 'number' }, result: { type: 'string', enum: ['beat', 'miss', 'in-line'] } } }, guidance_result: { type: 'object', properties: { raised: { type: 'boolean' }, lowered: { type: 'boolean' }, maintained: { type: 'boolean' }, details: { type: 'string' } } }, surprise_factor: { type: 'string', enum: ['large_beat', 'small_beat', 'in-line', 'small_miss', 'large_miss'] }, market_reaction_predicted: { type: 'string', enum: ['strong_positive', 'positive', 'neutral', 'negative', 'strong_negative'] }, key_beats: actions, key_misses: actions, consensus_source: { type: 'string', description: 'Source of consensus estimates used' }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/compare-quarters': {
        post: {
          operationId: 'compareQuarters',
          summary: 'Compare two earnings periods to identify material changes in financial performance and momentum',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['current_quarter', 'prior_quarter'], properties: { current_quarter: { type: 'string', description: 'Earnings report text for the current quarter' }, prior_quarter: { type: 'string', description: 'Earnings report text for the prior quarter' }, ticker: tickerSchema } } } } },
          responses: { '200': { description: 'Quarter comparison', content: { 'application/json': { schema: { type: 'object', properties: { trend: { type: 'string', enum: ['improving', 'stable', 'deteriorating'] }, revenue_change_pct: { type: 'number' }, eps_change_pct: { type: 'number' }, margin_change_pct: { type: 'number' }, material_changes: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, change: { type: 'string' }, significance: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, improving_areas: actions, deteriorating_areas: actions, momentum_score: { type: 'number' }, ...baseResponse } } } } }, '400': { description: 'Missing required fields' }, '500': { description: 'Comparison failed' } },
        },
      },
      '/segment-analysis': {
        post: {
          operationId: 'segmentAnalysis',
          summary: 'Extract and analyze business segment performance with revenue, growth, margins, highlights, and risks',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema } } } } },
          responses: { '200': { description: 'Segment analysis', content: { 'application/json': { schema: { type: 'object', properties: { segments: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, revenue: { type: 'number' }, revenue_unit: { type: 'string' }, growth_yoy_pct: { type: 'number' }, operating_income: { type: 'number' }, margin_pct: { type: 'number' }, highlights: actions, risks: actions } } }, largest_segment: { type: 'string' }, fastest_growing_segment: { type: 'string' }, declining_segments: actions, segment_mix_shift: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/management-sentiment': {
        post: {
          operationId: 'managementSentiment',
          summary: 'Analyze management tone, confidence signals, hedging language, and red flags from earnings call',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, transcript_type: { type: 'string', enum: ['call', 'report', 'press_release'], description: 'Type of earnings document' } } } } } },
          responses: { '200': { description: 'Management sentiment analysis', content: { 'application/json': { schema: { type: 'object', properties: { overall_tone: { type: 'string', enum: ['very_confident', 'confident', 'cautious', 'defensive', 'concerned'] }, sentiment_score: { type: 'number', description: '-100 (very bearish) to 100 (very bullish)' }, ceo_tone: { type: 'string' }, cfo_tone: { type: 'string' }, bullish_signals: actions, bearish_signals: actions, hedging_language: actions, forward_looking_statements: actions, topics_avoided: actions, red_flags: actions, analyst_qa_tone: { type: 'string', enum: ['open', 'guarded', 'deflecting'] }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/guidance-analysis': {
        post: {
          operationId: 'guidanceAnalysis',
          summary: 'Extract and analyze forward guidance — quarterly and annual revenue/EPS ranges, trend, and vs consensus',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema } } } } },
          responses: { '200': { description: 'Guidance analysis', content: { 'application/json': { schema: { type: 'object', properties: { guidance_provided: { type: 'boolean' }, next_quarter_revenue: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' }, unit: { type: 'string' } } }, next_quarter_eps: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' } } }, full_year_revenue: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' }, unit: { type: 'string' } } }, guidance_trend: { type: 'string', enum: ['raised', 'maintained', 'lowered', 'withdrawn'] }, guidance_confidence: { type: 'string', enum: ['specific', 'range', 'vague', 'none'] }, key_assumptions: actions, risk_factors_to_guidance: actions, vs_consensus: { type: 'string', enum: ['above', 'inline', 'below', 'unavailable'] }, source_quotes: actions, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/risk-factors': {
        post: {
          operationId: 'riskFactors',
          summary: 'Extract and categorize risk factors disclosed in earnings with severity, time horizon, and management response',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema } } } } },
          responses: { '200': { description: 'Risk factor analysis', content: { 'application/json': { schema: { type: 'object', properties: { risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, category: { type: 'string', enum: ['macro', 'competitive', 'operational', 'regulatory', 'financial', 'geopolitical'] }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, time_horizon: { type: 'string', enum: ['near-term', 'medium-term', 'long-term'] }, management_response: { type: 'string' }, source_quote: { type: 'string' } } } }, new_risks: actions, resolved_risks: actions, top_risk: { type: 'string' }, risk_trend: { type: 'string', enum: ['increasing', 'stable', 'decreasing'] }, overall_risk_rating: { type: 'string', enum: ['high', 'medium', 'low'] }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate earnings text readiness and recommend the best analysis endpoint before processing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema } } } } },
          responses: { '200': { description: 'Execution readiness check', content: { 'application/json': { schema: { type: 'object', properties: { execution_ready: { type: 'boolean' }, ticker: { type: 'string' }, content_length: { type: 'number' }, recommended_endpoint: { type: 'string' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, blocking_flags: actions, flag_definitions: { type: 'object', additionalProperties: { type: 'string' } }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' } },
        },
      },
      '/analyze': {
        post: {
          operationId: 'analyzeEarningsFull',
          summary: 'ONE-CALL: full earnings analysis — metrics, beats/misses, guidance, management sentiment, and investment signal',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['earnings_text'], properties: { earnings_text: earningsTextSchema, ticker: tickerSchema, fiscal_period: { type: 'string', description: 'e.g. Q1 2025' }, consensus_estimates: { type: 'object', description: 'Optional analyst consensus for beat/miss detection', properties: { revenue: { type: 'number' }, eps: { type: 'number' } } } } } } } },
          responses: { '200': { description: 'Complete earnings intelligence report', content: { 'application/json': { schema: { type: 'object', properties: { ticker: { type: 'string' }, fiscal_period: { type: 'string' }, overall_result: { type: 'string', enum: ['beat', 'miss', 'in-line'] }, revenue: { type: 'object', properties: { reported: { type: 'number' }, estimate: { type: 'number' }, beat_by_pct: { type: 'number' } } }, eps: { type: 'object', properties: { reported: { type: 'number' }, estimate: { type: 'number' }, beat_by_pct: { type: 'number' } } }, key_metrics: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' }, yoy_change_pct: { type: 'number' } } } }, guidance: { type: 'object', properties: { trend: { type: 'string', enum: ['raised', 'maintained', 'lowered', 'withdrawn'] }, next_quarter_eps_range: { type: 'string' }, full_year_revenue_range: { type: 'string' } } }, management_tone: { type: 'string', enum: ['very_confident', 'confident', 'cautious', 'defensive'] }, top_risks: actions, top_opportunities: actions, investment_signal: { type: 'string', enum: ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'] }, signal_rationale: { type: 'string' }, one_line_summary: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing earnings_text' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
