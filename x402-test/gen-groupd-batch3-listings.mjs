// Build groupd-finance-batch3-orbis-listings.json from the LIVE OpenAPI specs
// (prices + endpoint paths derived from x-pricing so listing == deployed code)
// merged with curated marketing metadata per API. Mirrors the batch-2 listing shape.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = '/workspaces/orbis-apis';
const specOf = (slug) => JSON.parse(readFileSync(`${ROOT}/openapi-specs/groupd-batch3/${slug}.openapi.json`, 'utf8'));

// Curated, human-readable metadata per API.
const META = {
  'break-even': {
    name: 'Break-Even Analysis API',
    shortDescription: 'Unit & revenue break-even, contribution margin, margin of safety.',
    description: 'Deterministic cost-volume-profit (CVP) analysis for autonomous financial-planning and pricing agents. Computes unit and revenue break-even points, contribution margin per unit and ratio, units/revenue required to hit a target profit, and margin of safety against current volume. No LLM — exact arithmetic.',
    category: 'Financial Planning',
    tags: ['finance', 'break-even', 'cvp', 'contribution-margin', 'pricing', 'unit-economics'],
    keywords: ['break-even analysis', 'cost volume profit', 'contribution margin', 'margin of safety', 'target profit', 'pricing analysis', 'fixed costs', 'variable costs'],
    capabilities: ['unit_break_even', 'revenue_break_even', 'contribution_margin', 'target_profit', 'margin_of_safety'],
    typicalUseCases: ['Pricing and cost-structure decisions', 'Startup runway and viability checks', 'Target-profit volume planning', 'Product line margin analysis', 'Autonomous financial planning'],
    recommendedChains: [
      { api: 'Unit Economics API', reason: 'Layer LTV:CAC and margin analysis on top of break-even' },
      { api: 'Payback Period API', reason: 'Evaluate the investment recovery timeline' },
      { api: 'NPV IRR API', reason: 'Value the project once break-even volume is known' },
    ],
  },
  'correlation-beta': {
    name: 'Correlation & Beta API',
    shortDescription: 'Pearson correlation/covariance and beta, alpha & R² vs a benchmark.',
    description: 'Deterministic portfolio statistics for risk and diversification agents. Computes Pearson correlation and covariance between two return series, and the beta, Jensen\'s alpha and R² of an asset versus a benchmark, with annualized alpha. No LLM — exact linear-algebra arithmetic on caller-supplied returns.',
    category: 'Risk Analytics',
    tags: ['finance', 'correlation', 'beta', 'alpha', 'r-squared', 'quantitative-finance'],
    keywords: ['pearson correlation', 'covariance', 'beta', 'jensen alpha', 'r squared', 'systematic risk', 'diversification', 'benchmark analysis'],
    capabilities: ['pearson_correlation', 'covariance', 'beta', 'jensen_alpha', 'r_squared'],
    typicalUseCases: ['Portfolio diversification analysis', 'Systematic-risk (beta) estimation', 'Hedge and pairs construction', 'Factor exposure measurement', 'Autonomous risk monitoring'],
    recommendedChains: [
      { api: 'Risk Ratios API', reason: 'Combine beta with Sharpe/Sortino for risk-adjusted views' },
      { api: 'Value At Risk API', reason: 'Quantify downside once correlations are known' },
      { api: 'Max Drawdown API', reason: 'Assess realized downside of the analyzed series' },
    ],
  },
  'kelly-criterion': {
    name: 'Kelly Criterion API',
    shortDescription: 'Optimal & fractional Kelly stake, edge, expected log-growth, risk of ruin.',
    description: 'Deterministic Kelly-criterion bet/position sizing for capital-allocation agents. Computes the optimal and fractional Kelly fraction, edge, expected log-growth, recommended stake against a bankroll, and the gambler\'s-ruin probability for flat even-money bets. No LLM — exact probability arithmetic. Not investment advice.',
    category: 'Risk Analytics',
    tags: ['finance', 'kelly-criterion', 'position-sizing', 'bankroll', 'risk-of-ruin', 'bet-sizing'],
    keywords: ['kelly criterion', 'position sizing', 'bet sizing', 'fractional kelly', 'bankroll management', 'expected log growth', 'risk of ruin', 'edge'],
    capabilities: ['kelly_fraction', 'fractional_kelly', 'expected_log_growth', 'recommended_stake', 'risk_of_ruin'],
    typicalUseCases: ['Position sizing for favorable bets', 'Bankroll/capital allocation', 'Conservative fractional-Kelly sizing', 'Risk-of-ruin estimation', 'Autonomous capital-allocation agents'],
    recommendedChains: [
      { api: 'Correlation & Beta API', reason: 'Size positions accounting for correlation/beta' },
      { api: 'Value At Risk API', reason: 'Cross-check sizing against tail risk' },
      { api: 'Risk Ratios API', reason: 'Evaluate the risk-adjusted quality of the edge' },
    ],
  },
  'payback-period': {
    name: 'Payback Period API',
    shortDescription: 'Simple & discounted payback, NPV, profitability index.',
    description: 'Deterministic capital-budgeting payback analysis for investment-screening agents. Computes simple (undiscounted) and discounted payback periods with fractional-period interpolation, NPV at a given discount rate, and the profitability index, flagging whether the investment is recovered within the horizon. No LLM — exact discounted-cashflow arithmetic.',
    category: 'Corporate Finance',
    tags: ['finance', 'payback-period', 'capital-budgeting', 'npv', 'profitability-index', 'investment-analysis'],
    keywords: ['payback period', 'discounted payback', 'net present value', 'npv', 'profitability index', 'capital budgeting', 'investment screening', 'cashflow analysis'],
    capabilities: ['simple_payback', 'discounted_payback', 'npv', 'profitability_index', 'recovery_flag'],
    typicalUseCases: ['Capital project screening', 'Investment recovery timelines', 'CapEx prioritization', 'Discounted-cashflow checks', 'Autonomous investment screening'],
    recommendedChains: [
      { api: 'NPV IRR API', reason: 'Full NPV/IRR valuation of the cashflows' },
      { api: 'DCF Valuation API', reason: 'Value the asset behind the cashflows' },
      { api: 'Break-Even Analysis API', reason: 'Tie recovery timeline to break-even volume' },
    ],
  },
  'unit-economics': {
    name: 'Unit Economics API',
    shortDescription: 'LTV, LTV:CAC ratio, CAC payback, gross & contribution margins.',
    description: 'Deterministic SaaS/subscription unit economics for growth and finance agents. Computes gross-margin-adjusted lifetime value, the LTV:CAC ratio, CAC payback in periods, customer lifetime from churn, and gross & contribution margins, with a health verdict. No LLM — exact arithmetic on caller-supplied ARPU/margin/churn/CAC.',
    category: 'Financial Analytics',
    tags: ['finance', 'unit-economics', 'ltv', 'cac', 'saas-metrics', 'margins'],
    keywords: ['unit economics', 'ltv', 'cac', 'ltv cac ratio', 'cac payback', 'customer lifetime value', 'gross margin', 'contribution margin', 'saas metrics'],
    capabilities: ['ltv', 'ltv_cac_ratio', 'cac_payback', 'customer_lifetime', 'margins'],
    typicalUseCases: ['SaaS unit-economics health checks', 'LTV:CAC and CAC-payback monitoring', 'Pricing and margin analysis', 'Growth-efficiency evaluation', 'Autonomous finance/growth agents'],
    recommendedChains: [
      { api: 'Break-Even Analysis API', reason: 'Relate unit economics to break-even volume' },
      { api: 'Payback Period API', reason: 'Compare CAC payback with project payback' },
      { api: 'DCF Valuation API', reason: 'Roll unit economics into a valuation' },
    ],
  },
};

const ENDPOINT_DESC = {
  '/lookup': 'One-call answer with reasoning (key_factors + invalidators)',
};

const listings = Object.keys(META).map((slug) => {
  const spec = specOf(slug);
  const m = META[slug];
  const base = `https://orbis-apis.onrender.com/${slug}`;
  const posts = [];
  for (const [path, ops] of Object.entries(spec.paths)) {
    const op = ops.post;
    if (!op) continue;
    const price = op['x-pricing']?.price_usdc;
    posts.push({ path, price, summary: op.summary });
  }
  const lookupPrice = posts.find((p) => p.path === '/lookup')?.price;
  return {
    name: m.name,
    shortDescription: m.shortDescription,
    description: m.description,
    category: m.category,
    tier: 'Agent Decision API',
    baseUrl: base,
    websiteUrl: 'https://orbis-apis.onrender.com',
    docsUrl: `${base}/openapi.json`,
    openApiSpecUrl: `${base}/openapi.json`,
    logoUrl: '',
    tags: m.tags,
    keywords: m.keywords,
    capabilities: m.capabilities,
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-agent-marketplace-ready': true,
    'x-pay-per-call-optimized': true,
    confidenceModel: 'deterministic',
    privacy: { data_stored: false, retention: 'none' },
    typicalUseCases: m.typicalUseCases,
    recommendedChains: m.recommendedChains,
    endpointPricing: posts.map((p) => ({ endpoint: p.path, price_usdc: p.price })),
    tiers: [
      { name: 'Free', isFree: true, requestsPerDay: 100, requestsPerMonth: 3000 },
      {
        name: 'Pay Per Call',
        isFree: false,
        pricingType: 'per_call',
        pricePerCall: lookupPrice,
        requestsPerDay: 100000,
        requestsPerMonth: 3000000,
        endpointPricing: posts.map((p) => ({
          method: 'POST',
          pathPattern: p.path,
          pricePerCallUsdc: p.price,
          description: ENDPOINT_DESC[p.path] || p.summary,
        })),
      },
    ],
  };
});

const outPath = `${ROOT}/groupd-finance-batch3-orbis-listings.json`;
writeFileSync(outPath, JSON.stringify(listings, null, 2) + '\n');
console.log('Wrote', outPath, `(${listings.length} APIs)`);
for (const l of listings) console.log(' ', l.name, '—', l.endpointPricing.map((e) => `${e.endpoint} $${e.price_usdc}`).join(', '));
