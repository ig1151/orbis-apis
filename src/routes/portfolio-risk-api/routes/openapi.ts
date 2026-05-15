import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Portfolio Risk API',
      version: '1.0.0',
      description: 'Score portfolio risk, analyze concentration and sector exposure, run stress tests, estimate drawdowns, and generate rebalancing action plans for investment agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/portfolio-risk' }],
    paths: {
      '/score-risk': {
        post: {
          operationId: 'scoreRisk',
          summary: 'Score overall portfolio risk with breakdown by market, concentration, liquidity, and correlation risk',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, portfolio_value: { type: 'number' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] } } } } } },
          responses: { '200': { description: 'Portfolio risk score', content: { 'application/json': { schema: { type: 'object', properties: { overall_risk_score: { type: 'number' }, risk_level: { type: 'string', enum: ['very_low', 'low', 'moderate', 'high', 'very_high'] }, risk_vs_tolerance: { type: 'string', enum: ['appropriate', 'too_aggressive', 'too_conservative'] }, risk_breakdown: { type: 'object', properties: { market_risk: { type: 'number' }, concentration_risk: { type: 'number' }, liquidity_risk: { type: 'number' }, correlation_risk: { type: 'number' }, currency_risk: { type: 'number' } } }, diversification_score: { type: 'number' }, max_drawdown_estimate_pct: { type: 'number' }, recommended_adjustments: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/concentration-analysis': {
        post: {
          operationId: 'concentrationAnalysis',
          summary: 'Analyze portfolio concentration across assets, sectors, and geographies with Herfindahl index',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {} } } } } },
          responses: { '200': { description: 'Concentration analysis', content: { 'application/json': { schema: { type: 'object', properties: { top_10_holdings_pct: { type: 'number' }, largest_single_position_pct: { type: 'number' }, sector_concentration: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, weight_pct: { type: 'number' }, holding_count: { type: 'number' } } } }, herfindahl_index: { type: 'number' }, concentration_risk_level: { type: 'string', enum: ['low', 'moderate', 'high', 'very_high'] }, over_concentrated_areas: actions, recommendations: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/correlation-matrix': {
        post: {
          operationId: 'correlationMatrix',
          summary: 'Estimate correlations between holdings, identify clustering risk, and surface hedging opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, lookback_period: { type: 'string' } } } } } },
          responses: { '200': { description: 'Correlation analysis', content: { 'application/json': { schema: { type: 'object', properties: { high_correlation_pairs: { type: 'array', items: { type: 'object', properties: { asset_a: { type: 'string' }, asset_b: { type: 'string' }, estimated_correlation: { type: 'number' }, risk_note: { type: 'string' } } } }, portfolio_avg_correlation: { type: 'number' }, diversification_benefit_score: { type: 'number' }, hedging_opportunities: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/stress-test': {
        post: {
          operationId: 'stressTest',
          summary: 'Run historical stress scenarios (GFC, COVID, rate shock) and estimate portfolio losses and recovery times',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, scenarios: { type: 'array', items: { type: 'string' } }, portfolio_value: { type: 'number' } } } } } },
          responses: { '200': { description: 'Stress test results', content: { 'application/json': { schema: { type: 'object', properties: { scenarios: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, estimated_loss_pct: { type: 'number' }, estimated_loss_usd: { type: 'number' }, recovery_time_estimate: { type: 'string' } } } }, worst_case_scenario: { type: 'string' }, worst_case_loss_pct: { type: 'number' }, portfolio_resilience: { type: 'string', enum: ['resilient', 'moderate', 'fragile'] }, protective_assets: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/sector-exposure': {
        post: {
          operationId: 'sectorExposure',
          summary: 'Analyze sector weights vs benchmark, identify overweight/underweight positions, and score active risk',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, benchmark: { type: 'string' } } } } } },
          responses: { '200': { description: 'Sector exposure analysis', content: { 'application/json': { schema: { type: 'object', properties: { sector_weights: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, portfolio_weight_pct: { type: 'number' }, benchmark_weight_pct: { type: 'number' }, tilt: { type: 'string', enum: ['overweight', 'inline', 'underweight'] } } } }, active_risk_score: { type: 'number' }, rebalancing_suggestions: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/drawdown-analysis': {
        post: {
          operationId: 'drawdownAnalysis',
          summary: 'Estimate max drawdown, VaR, CVaR, and time-to-recovery for the portfolio over a given time horizon',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, time_horizon: { type: 'string' } } } } } },
          responses: { '200': { description: 'Drawdown risk estimates', content: { 'application/json': { schema: { type: 'object', properties: { max_drawdown_estimate_pct: { type: 'number' }, var_95_pct: { type: 'number' }, cvar_95_pct: { type: 'number' }, drawdown_protection_score: { type: 'number' }, protection_strategies: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/rebalance-suggestions': {
        post: {
          operationId: 'rebalanceSuggestions',
          summary: 'Generate specific buy/sell trades to rebalance portfolio toward target allocation with tax and cost considerations',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, target_allocation: { type: 'object' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] }, portfolio_value: { type: 'number' } } } } } },
          responses: { '200': { description: 'Rebalancing plan', content: { 'application/json': { schema: { type: 'object', properties: { rebalancing_needed: { type: 'boolean' }, urgency: { type: 'string', enum: ['immediate', 'soon', 'optional', 'none'] }, trades: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] }, current_weight_pct: { type: 'number' }, target_weight_pct: { type: 'number' }, delta_pct: { type: 'number' }, rationale: { type: 'string' } } } }, priority_trades: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate portfolio data readiness before running risk analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {} } } } } },
          responses: { '200': { description: 'Execution readiness', content: { 'application/json': { schema: { type: 'object', properties: { execution_ready: { type: 'boolean' }, holding_count: { type: 'number' }, recommended_endpoint: { type: 'string' }, next_api: { type: 'string' }, blocking_flags: actions, privacy } } } } }, '400': { description: 'Missing holdings' } },
        },
      },
      '/analyze-portfolio': {
        post: {
          operationId: 'analyzePortfolio',
          summary: 'ONE-CALL: full portfolio risk — risk score, concentration, sector tilts, stress test, and rebalancing priority',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['holdings'], properties: { holdings: {}, portfolio_value: { type: 'number' }, risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] } } } } } },
          responses: { '200': { description: 'Complete portfolio risk intelligence', content: { 'application/json': { schema: { type: 'object', properties: { overall_risk_score: { type: 'number' }, risk_level: { type: 'string', enum: ['very_low', 'low', 'moderate', 'high', 'very_high'] }, concentration_risk: { type: 'string', enum: ['low', 'moderate', 'high', 'very_high'] }, stress_test_worst_case_pct: { type: 'number' }, diversification_score: { type: 'number' }, portfolio_health_score: { type: 'number' }, immediate_actions: actions, rebalancing_priority: { type: 'string', enum: ['immediate', 'soon', 'optional', 'none'] }, one_line_summary: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } }, '400': { description: 'Missing holdings' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
