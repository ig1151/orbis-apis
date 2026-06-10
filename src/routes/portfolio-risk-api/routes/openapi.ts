import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const provenance = { type: 'object', properties: { source: { type: 'string' }, extraction_method: { type: 'string' }, data_as_of: { type: 'string' }, confidence: { type: 'number' } } };

const holdingsSchema = {
  oneOf: [
    { type: 'string', description: 'JSON string of holdings array or object' },
    { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, weight_pct: { type: 'number' }, value_usd: { type: 'number' }, sector: { type: 'string' }, asset_class: { type: 'string' } } } },
    { type: 'object', additionalProperties: { type: 'number' }, description: 'Map of {ticker: weight_pct}' },
  ],
  description: 'Portfolio holdings as array of positions or weight map',
};

const baseResponse = {
  trace_id: { type: 'string', description: 'Unique request trace ID for debugging and audit' },
  execution_id: { type: 'string', description: 'Execution ID for workflow chaining' },
  computed_at: { type: 'string', format: 'date-time' },
  provenance,
  privacy,
  confidence_per_section: confidence,
  recommended_actions_priority_order: actions,
  disclaimer: { type: 'string', description: 'Informational only. Not financial advice. Consult a qualified financial advisor before making investment decisions.' },
  paper_mode_recommended: { type: 'boolean', description: 'Whether paper/simulation mode is recommended before acting on these results' },
  tax_caveat: { type: 'string', description: 'Tax implications vary by jurisdiction. Consult a tax advisor.' },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Portfolio Risk API',
      version: '1.0.0',
      description: 'Score portfolio risk, analyze concentration and sector exposure, run stress tests, estimate drawdowns, and generate rebalancing action plans for investment agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x-financial-disclaimer': 'Informational only. Not financial advice. Do not act on rebalancing suggestions without consulting a qualified financial advisor. Tax consequences vary by jurisdiction.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/portfolio-risk' }],
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
      '/score-risk': {
        post: {
          operationId: 'scoreRisk',
          summary: 'Score overall portfolio risk with breakdown by market, concentration, liquidity, and correlation risk',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, portfolio_value: { type: 'number', description: 'Total portfolio value in USD' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'], description: 'Investor risk tolerance level' } } } } } },
          responses: { '200': { description: 'Portfolio risk score', content: { 'application/json': { schema: { type: 'object', properties: { overall_risk_score: { type: 'number', description: '0 (lowest) to 100 (highest risk)' }, risk_level: { type: 'string', enum: ['very_low', 'low', 'moderate', 'high', 'very_high'] }, risk_vs_tolerance: { type: 'string', enum: ['appropriate', 'too_aggressive', 'too_conservative'] }, risk_breakdown: { type: 'object', properties: { market_risk: { type: 'number' }, concentration_risk: { type: 'number' }, liquidity_risk: { type: 'number' }, correlation_risk: { type: 'number' }, currency_risk: { type: 'number' } } }, top_risk_contributors: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, contribution_pct: { type: 'number' }, risk_factor: { type: 'string' } } } }, diversification_score: { type: 'number' }, sharpe_ratio_estimate: { type: 'number' }, max_drawdown_estimate_pct: { type: 'number' }, recommended_adjustments: actions, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/concentration-analysis': {
        post: {
          operationId: 'concentrationAnalysis',
          summary: 'Analyze portfolio concentration across assets, sectors, and geographies with Herfindahl index',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema } } } } },
          responses: { '200': { description: 'Concentration analysis', content: { 'application/json': { schema: { type: 'object', properties: { top_10_holdings_pct: { type: 'number' }, largest_single_position_pct: { type: 'number' }, largest_position: { type: 'string' }, sector_concentration: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, weight_pct: { type: 'number' }, holding_count: { type: 'number' } } } }, geographic_concentration: { type: 'array', items: { type: 'object', properties: { region: { type: 'string' }, weight_pct: { type: 'number' } } } }, herfindahl_index: { type: 'number', description: '0 = perfectly diversified, 1 = fully concentrated' }, concentration_risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'very_high'] }, over_concentrated_areas: actions, under_diversified_areas: actions, recommendations: actions, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/correlation-matrix': {
        post: {
          operationId: 'correlationMatrix',
          summary: 'Estimate correlations between holdings, identify clustering risk, and surface hedging opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, lookback_period: { type: 'string', description: 'Historical lookback period, e.g. 1Y, 6M, 3Y', default: '1Y' } } } } } },
          responses: { '200': { description: 'Correlation analysis', content: { 'application/json': { schema: { type: 'object', properties: { high_correlation_pairs: { type: 'array', items: { type: 'object', properties: { asset_a: { type: 'string' }, asset_b: { type: 'string' }, estimated_correlation: { type: 'number', description: '-1 (inverse) to 1 (perfect correlation)' }, risk_note: { type: 'string' } } } }, low_correlation_pairs: { type: 'array', items: { type: 'object', properties: { asset_a: { type: 'string' }, asset_b: { type: 'string' }, estimated_correlation: { type: 'number' } } } }, correlation_clusters: { type: 'array', items: { type: 'object', properties: { cluster_name: { type: 'string' }, assets: actions, avg_intra_cluster_correlation: { type: 'number' } } } }, portfolio_avg_correlation: { type: 'number' }, diversification_benefit_score: { type: 'number' }, hedging_opportunities: actions, tail_risk_note: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/stress-test': {
        post: {
          operationId: 'stressTest',
          summary: 'Run historical stress scenarios (GFC, COVID, rate shock) and estimate portfolio losses and recovery times',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, scenarios: { type: 'array', items: { type: 'string' }, description: 'Scenario names to test, e.g. ["2008 GFC", "2020 COVID crash", "2022 rate shock"]' }, portfolio_value: { type: 'number', description: 'Total portfolio value in USD' } } } } } },
          responses: { '200': { description: 'Stress test results', content: { 'application/json': { schema: { type: 'object', properties: { scenarios: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, estimated_loss_pct: { type: 'number' }, estimated_loss_usd: { type: 'number' }, recovery_time_estimate: { type: 'string' }, most_impacted_assets: actions } } }, worst_case_scenario: { type: 'string' }, worst_case_loss_pct: { type: 'number' }, portfolio_resilience: { type: 'string', enum: ['resilient', 'moderate', 'fragile'] }, tail_risk_probability_pct: { type: 'number' }, protective_assets: actions, vulnerability_summary: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/sector-exposure': {
        post: {
          operationId: 'sectorExposure',
          summary: 'Analyze sector weights vs benchmark, identify overweight/underweight positions, and score active risk',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, benchmark: { type: 'string', description: 'Benchmark index to compare against', default: 'S&P 500' } } } } } },
          responses: { '200': { description: 'Sector exposure analysis', content: { 'application/json': { schema: { type: 'object', properties: { sector_weights: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, portfolio_weight_pct: { type: 'number' }, benchmark_weight_pct: { type: 'number' }, overweight_pct: { type: 'number' }, tilt: { type: 'string', enum: ['overweight', 'inline', 'underweight'] } } } }, largest_overweight: { type: 'string' }, largest_underweight: { type: 'string' }, active_risk_score: { type: 'number' }, cyclical_vs_defensive_ratio: { type: 'number' }, rebalancing_suggestions: actions, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/drawdown-analysis': {
        post: {
          operationId: 'drawdownAnalysis',
          summary: 'Estimate max drawdown, VaR, CVaR, and time-to-recovery for the portfolio over a given time horizon',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, time_horizon: { type: 'string', description: 'Analysis time horizon, e.g. 1Y, 3Y, 5Y', default: '1Y' } } } } } },
          responses: { '200': { description: 'Drawdown risk estimates', content: { 'application/json': { schema: { type: 'object', properties: { max_drawdown_estimate_pct: { type: 'number' }, expected_drawdown_pct: { type: 'number' }, time_to_recover_estimate: { type: 'string' }, var_95_pct: { type: 'number', description: 'Value at Risk at 95% confidence' }, cvar_95_pct: { type: 'number', description: 'Conditional VaR (Expected Shortfall) at 95%' }, drawdown_contributors: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, contribution_pct: { type: 'number' } } } }, drawdown_protection_score: { type: 'number' }, protection_strategies: actions, risk_adjusted_return_estimate: { type: 'number' }, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/rebalance-suggestions': {
        post: {
          operationId: 'rebalanceSuggestions',
          summary: 'Generate specific buy/sell trades to rebalance portfolio toward target allocation with tax and cost considerations',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, target_allocation: { type: 'object', additionalProperties: { type: 'number' }, description: 'Target allocation as {ticker: target_weight_pct}. If omitted, derives optimal from risk_tolerance.' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' }, portfolio_value: { type: 'number', description: 'Total portfolio value in USD for sizing trades' } } } } } },
          responses: { '200': { description: 'Rebalancing trade plan', content: { 'application/json': { schema: { type: 'object', properties: { rebalancing_needed: { type: 'boolean' }, urgency: { type: 'string', enum: ['immediate', 'soon', 'optional', 'none'] }, trades: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] }, current_weight_pct: { type: 'number' }, target_weight_pct: { type: 'number' }, delta_pct: { type: 'number' }, estimated_trade_size_usd: { type: 'number' }, rationale: { type: 'string' } } } }, estimated_risk_reduction_pct: { type: 'number' }, transaction_cost_estimate_usd: { type: 'number' }, priority_trades: actions, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate portfolio data readiness and confirm execution safety before running risk analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema } } } } },
          responses: { '200': { description: 'Execution readiness check', content: { 'application/json': { schema: { type: 'object', properties: { execution_ready: { type: 'boolean' }, holding_count: { type: 'number' }, recommended_endpoint: { type: 'string' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, blocking_flags: actions, flag_definitions: { type: 'object', additionalProperties: { type: 'string' } }, ...baseResponse } } } } }, '400': { description: 'Missing holdings' } },
        },
      },
      '/analyze-portfolio': {
        post: {
          operationId: 'analyzePortfolio',
          summary: 'ONE-CALL: full portfolio risk — risk score, concentration, sector tilts, stress test, and rebalancing priority',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: holdingsSchema, portfolio_value: { type: 'number', description: 'Total portfolio value in USD' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' } } } } } },
          responses: { '200': { description: 'Complete portfolio risk intelligence report', content: { 'application/json': { schema: { type: 'object', properties: { overall_risk_score: { type: 'number' }, risk_level: { type: 'string', enum: ['very_low', 'low', 'moderate', 'high', 'very_high'] }, risk_vs_tolerance: { type: 'string', enum: ['appropriate', 'too_aggressive', 'too_conservative'] }, concentration_risk: { type: 'string', enum: ['low', 'moderate', 'high', 'very_high'] }, top_5_positions_pct: { type: 'number' }, sector_tilts: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, tilt: { type: 'string', enum: ['overweight', 'inline', 'underweight'] }, weight_pct: { type: 'number' } } } }, stress_test_worst_case_pct: { type: 'number' }, max_drawdown_estimate_pct: { type: 'number' }, diversification_score: { type: 'number' }, top_risks: actions, immediate_actions: actions, rebalancing_priority: { type: 'string', enum: ['immediate', 'soon', 'optional', 'none'] }, portfolio_health_score: { type: 'number' }, one_line_summary: { type: 'string' }, ...baseResponse } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
