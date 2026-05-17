// Applies 5 A+ polish passes to all 20 *-api-openapi.json files:
// 1. format: uuid/email/uri on known field names
// 2. required arrays inside nested objects
// 3. endpoint-level x-pricing from info.json
// 4. request + response examples
// 5. x-compliance-notice on people-data APIs
import { readFileSync, writeFileSync } from 'fs';

const PEOPLE_APIS = ['crm-contact-intelligence','founder-background','executive-risk','decision-maker-fit'];
const COMPLIANCE_NOTICE = 'Use only public/business data and permitted enrichment workflows. Verify applicable privacy regulations (GDPR, CCPA) before processing personal data.';

// ── 1. FORMAT FIELDS ─────────────────────────────────────────────────────────
const EMAIL_FIELDS = new Set(['email','from_email','to_email']);
const URI_FIELDS = new Set(['url','image_url','linkedin_url','og_image','final_url','link','embed_url','image_url_a','image_url_b','base_url','favicon','social_url','twitter_url']);
const UUID_FIELDS = new Set(['trace_id']);
const DATE_FIELDS = new Set(['computed_at','retrieved_at','timestamp','inception_date','date','peak_date','cheapest_time','most_expensive_time','peak_window','opportunity_window','best_time_to_transact']);

function applyFormats(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(applyFormats); return; }
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object') {
      if (val.type === 'string' && !val.format) {
        if (EMAIL_FIELDS.has(key)) val.format = 'email';
        else if (URI_FIELDS.has(key)) val.format = 'uri';
        else if (UUID_FIELDS.has(key)) val.format = 'uuid';
        else if (DATE_FIELDS.has(key)) val.format = 'date-time';
      }
      applyFormats(val);
    }
  }
}

// ── 2. REQUIRED IN NESTED OBJECTS ────────────────────────────────────────────
function applyNestedRequired(spec) {
  // Walk all response schemas and fix known nested objects
  for (const [, methods] of Object.entries(spec.paths || {})) {
    for (const [, op] of Object.entries(methods || {})) {
      if (!op?.responses) continue;
      const schema = op.responses?.['200']?.content?.['application/json']?.schema;
      if (!schema?.properties) continue;
      const p = schema.properties;

      // source_provenance
      if (p.source_provenance?.properties && !p.source_provenance.required)
        p.source_provenance.required = ['provider', 'retrieved_at', 'freshness_score'];

      // privacy
      if (p.privacy?.properties && !p.privacy.required)
        p.privacy.required = ['data_stored', 'retention'];

      // arrays whose items have properties but no required
      const ARRAY_REQUIRED = {
        red_flags: ['flag', 'severity'],
        trades: ['transaction_type', 'value_usd', 'date'],
        timeline: ['year', 'event'],
        results: null, // handled per-type below
        signals: ['signal', 'strength'],
        vulnerabilities: ['type', 'severity'],
        functions: ['name', 'signature'],
        top_holdings: ['symbol', 'weight_pct'],
        sector_allocation: ['sector', 'weight_pct'],
        token_transfers: ['token', 'from', 'to'],
        internal_txs: ['from', 'to'],
        suggestions: ['suggestion', 'impact'],
        flags: ['flag', 'severity'],
        issues: ['rule', 'severity', 'message'],
        breakout_topics: ['topic', 'velocity_score'],
        decoded_params: ['name', 'type', 'value'],
        sections: ['heading', 'level'],
        ventures: ['company', 'outcome'],
        history: ['date', 'value_usd'],
        tokens: ['symbol', 'value_usd'],
        notable_transactions: ['transaction_type', 'value_usd'],
        top_10_holdings: ['symbol', 'weight_pct'],
        recent_headlines: ['headline', 'date'],
      };

      for (const [fieldName, reqFields] of Object.entries(ARRAY_REQUIRED)) {
        const arr = p[fieldName];
        if (arr?.type === 'array' && arr.items?.properties && !arr.items.required && reqFields) {
          arr.items.required = reqFields.filter(f => arr.items.properties[f]);
        }
      }

      // batch results items: require fields that are present
      if (p.results?.type === 'array' && p.results.items?.properties && !p.results.items.required) {
        const itemProps = Object.keys(p.results.items.properties);
        // Require first 3 meaningful fields (not utility fields)
        const useful = itemProps.filter(k => !['trace_id','success','computed_at'].includes(k));
        if (useful.length >= 2) p.results.items.required = useful.slice(0, 3);
      }
    }
  }
}

// ── 3. ENDPOINT-LEVEL PRICING ─────────────────────────────────────────────────
function applyEndpointPricing(spec, slug) {
  let infoData;
  try { infoData = JSON.parse(readFileSync(`${slug}-api-info.json`)); } catch { return; }
  const ppc = infoData?.pricing?.pay_per_call;
  if (!ppc) return;
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    if (path === '/') continue;
    const endpointKey = path.slice(1); // strip leading /
    const price = ppc[endpointKey];
    if (price && methods.post) {
      methods.post['x-pricing'] = { pricePerCallUsdc: parseFloat(price.replace('$', '')) };
    }
  }
}

// ── 4. EXAMPLES ──────────────────────────────────────────────────────────────
const ENV_EX = {
  trace_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  computed_at: '2026-05-17T12:00:00Z',
  success: true,
  source_provenance: { provider: 'orbis-intelligence', retrieved_at: '2026-05-17T12:00:00Z', freshness_score: 0.95 },
  cache_ttl_seconds: 3600,
  cache_recommended: true,
  recommended_next_api: 'orbis-apis.onrender.com',
  recommended_next_endpoint: null,
  automation_safe: true
};
const INTEL_ENV_EX = { ...ENV_EX, confidence_per_section: { primary: 0.92, secondary: 0.87 }, recommended_actions_priority_order: ['review-output', 'chain-next-api'], privacy: { data_stored: false, retention: 'none' } };

const re = (domain, intel = false) => ({ ...domain, ...(intel ? INTEL_ENV_EX : ENV_EX) });

const EXAMPLES = {
  'crm-contact-intelligence': {
    '/enrich': { req: { email: 'sarah.chen@techcorp.io', company: 'TechCorp' }, resp: re({ email: 'sarah.chen@techcorp.io', name: 'Sarah Chen', title: 'VP of Engineering', seniority: 'vp', company: 'TechCorp', linkedin_url: 'https://linkedin.com/in/sarahchen', location: 'San Francisco, CA' }) },
    '/score': { req: { email: 'sarah.chen@techcorp.io' }, resp: re({ outreach_score: 87, fit_score: 92, recommended_action: 'outreach-now' }) },
    '/segment': { req: { email: 'sarah.chen@techcorp.io' }, resp: re({ persona: 'Technical Decision-Maker', buyer_stage: 'consideration', engagement_tier: 'high' }) },
    '/execution-gate': { req: { email: 'sarah.chen@techcorp.io', objective: 'outreach' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/contact-intelligence': { req: { email: 'sarah.chen@techcorp.io', company: 'TechCorp' }, resp: re({ enriched_profile: { name: 'Sarah Chen', title: 'VP of Engineering', seniority: 'vp', company: 'TechCorp', linkedin_url: 'https://linkedin.com/in/sarahchen' }, outreach_score: 87, persona: 'Technical Decision-Maker', recommended_action: 'outreach-now' }, true) },
    '/intent-signals': { req: { email: 'sarah.chen@techcorp.io' }, resp: re({ intent_score: 74, intent_level: 'warm', signals: ['viewed pricing page', 'attended webinar', 'linkedin job posting for role we solve'] }) },
    '/batch': { req: { contacts: [{ email: 'a@co.io', company: 'Co A' }, { email: 'b@co.io', company: 'Co B' }] }, resp: re({ count: 2, results: [{ email: 'a@co.io', name: 'Alice A', title: 'CTO', seniority: 'c-level', outreach_score: 91 }, { email: 'b@co.io', name: 'Bob B', title: 'Director of Product', seniority: 'director', outreach_score: 72 }] }) }
  },
  'founder-background': {
    '/lookup': { req: { name: 'Patrick Collison', company: 'Stripe' }, resp: re({ name: 'Patrick Collison', current_company: 'Stripe', current_title: 'CEO', education: [{ institution: 'MIT', degree: 'Physics', year: 2009 }], previous_companies: ['Auctomatic'], background_summary: 'Co-founded Stripe at 22, previously sold Auctomatic for $5M.', years_experience: 16 }) },
    '/score': { req: { name: 'Patrick Collison', company: 'Stripe' }, resp: re({ credibility_score: 98, success_likelihood: 'high', investor_signal: 'strong-yes' }) },
    '/timeline': { req: { name: 'Patrick Collison', company: 'Stripe' }, resp: re({ timeline: [{ year: 2008, event: 'Founded Auctomatic', company: 'Auctomatic', type: 'founding' }, { year: 2009, event: 'Acquired by Live Current Media', company: 'Auctomatic', type: 'exit' }, { year: 2010, event: 'Co-founded Stripe', company: 'Stripe', type: 'founding' }], total_exits: 1, total_years_founding: 16 }) },
    '/execution-gate': { req: { name: 'Patrick Collison', objective: 'diligence' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/founder-intelligence': { req: { name: 'Patrick Collison', company: 'Stripe' }, resp: re({ credibility_score: 98, investor_signal: 'strong-yes', diligence_verdict: 'Exceptional founder with proven exit and unicorn track record.', due_diligence_questions: ['How does Stripe plan to expand into emerging markets?', 'What is the regulatory strategy for crypto payments?'] }, true) },
    '/track-record': { req: { name: 'Patrick Collison' }, resp: re({ ventures: [{ company: 'Auctomatic', role: 'Co-Founder', outcome: 'acquired', years: 1 }, { company: 'Stripe', role: 'CEO', outcome: 'active-unicorn', years: 15 }], track_record_score: 97, pattern: 'Serial founder, fast scaling, enterprise fintech focus', notable_exits: ['Auctomatic (2009)'] }) },
    '/batch': { req: { founders: [{ name: 'Patrick Collison', company: 'Stripe' }, { name: 'Tobi Lütke', company: 'Shopify' }] }, resp: re({ count: 2, results: [{ name: 'Patrick Collison', credibility_score: 98, investor_signal: 'strong-yes', diligence_verdict: 'Exceptional' }, { name: 'Tobi Lütke', credibility_score: 96, investor_signal: 'strong-yes', diligence_verdict: 'Top-tier' }] }) }
  },
  'executive-risk': {
    '/assess': { req: { name: 'John Smith', company: 'Acme Corp', role: 'CEO' }, resp: re({ overall_risk: 'low', risk_score: 18, risk_dimensions: { reputational: 15, financial: 20, legal: 12, operational: 25 } }) },
    '/red-flags': { req: { name: 'John Smith', company: 'Acme Corp' }, resp: re({ red_flags: [], flag_count: 0, escalation_required: false }) },
    '/reputation': { req: { name: 'John Smith', company: 'Acme Corp' }, resp: re({ reputation_score: 82, industry_standing: 'good', media_sentiment: 'positive' }) },
    '/execution-gate': { req: { name: 'John Smith', objective: 'partnership' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/executive-intelligence': { req: { name: 'John Smith', company: 'Acme Corp', role: 'CEO' }, resp: re({ overall_risk: 'low', red_flags: [], reputation_score: 82, engagement_recommendation: 'Proceed with partnership discussions — no material risk factors detected.' }, true) },
    '/news-signals': { req: { name: 'John Smith', company: 'Acme Corp', lookback_days: 90 }, resp: re({ news_risk_score: 12, recent_headlines: [{ headline: 'Acme Corp CEO keynote at TechSummit', source: 'TechCrunch', date: '2026-05-01', sentiment: 'positive' }], alert_level: 'none' }) },
    '/batch': { req: { executives: [{ name: 'John Smith', company: 'Acme Corp' }] }, resp: re({ count: 1, results: [{ name: 'John Smith', overall_risk: 'low', risk_score: 18, escalation_required: false }] }) }
  },
  'decision-maker-fit': {
    '/score': { req: { contact_name: 'Maria Garcia', company: 'RetailCo', title: 'Chief Digital Officer' }, resp: re({ fit_score: 89, authority_score: 94, role_alignment: 'economic-buyer', icp_match: 'strong' }) },
    '/persona': { req: { contact_name: 'Maria Garcia', company: 'RetailCo', title: 'Chief Digital Officer' }, resp: re({ archetype: 'Visionary Transformer', primary_goals: ['digital transformation', 'omnichannel growth', 'cost reduction'], pain_points: ['legacy system debt', 'slow deployment cycles', 'siloed data'], decision_style: 'autonomous' }) },
    '/outreach-angle': { req: { contact_name: 'Maria Garcia', company: 'RetailCo', title: 'CDO', product_context: 'AI workflow automation' }, resp: re({ primary_angle: 'Speed-to-value — cut integration time from months to days', subject_line_ideas: ['RetailCo → 10× faster deployments?', 'How CDOs at Top 50 retailers cut tech debt in Q1'], value_proposition_framing: 'Focus on autonomous execution and eliminating manual integration overhead', tone_recommendation: 'bold, peer-to-peer, data-led' }) },
    '/execution-gate': { req: { contact_name: 'Maria Garcia', objective: 'send-email' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/fit-intelligence': { req: { contact_name: 'Maria Garcia', company: 'RetailCo', title: 'CDO' }, resp: re({ fit_score: 89, persona: 'Visionary Transformer', outreach_angle: 'Speed-to-value — cut integration time from months to days', recommended_action: 'outreach-now' }, true) },
    '/buying-signals': { req: { contact_name: 'Maria Garcia', company: 'RetailCo' }, resp: re({ buying_signal_score: 76, in_market: true, signals: ['posted job for AI integration lead', 'attended automation conference', 'competitor recently switched vendors'], urgency: 'near-term' }) },
    '/batch': { req: { contacts: [{ contact_name: 'Maria Garcia', company: 'RetailCo', title: 'CDO' }] }, resp: re({ count: 1, results: [{ contact_name: 'Maria Garcia', fit_score: 89, role_alignment: 'economic-buyer', recommended_action: 'outreach-now' }] }) }
  },
  'html-to-markdown': {
    '/convert': { req: { html: '<h1>Hello World</h1><p>This is <strong>bold</strong> text.</p>', base_url: 'https://example.com' }, resp: re({ markdown: '# Hello World\n\nThis is **bold** text.', compression_ratio: 0.61, word_count: 5, image_count: 0 }) },
    '/clean': { req: { markdown: '# Title\n\n\n\nSome text  \n\n\n' }, resp: re({ cleaned_markdown: '# Title\n\nSome text', issues_fixed: ['removed extra blank lines', 'stripped trailing whitespace'], original_length: 32, cleaned_length: 18 }) },
    '/extract': { req: { html: '<html><head><title>Product Page</title></head><body><h1>Product</h1><p>Description</p></body></html>', base_url: 'https://store.com' }, resp: re({ title: 'Product Page', main_content: 'Description', headings: ['Product'], links: [] }) },
    '/execution-gate': { req: { html: '<p>test</p>', objective: 'ingest' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/html-intelligence': { req: { html: '<article><h1>AI Trends</h1><p>In 2026...</p></article>', base_url: 'https://blog.com' }, resp: re({ markdown: '# AI Trends\n\nIn 2026...', title: 'AI Trends', content_type: 'article', quality_score: 84, word_count: 3 }, true) },
    '/simplify': { req: { html: '<p>The aforementioned paradigmatic methodologies...</p>', reading_level: 'grade-8' }, resp: re({ plain_text: 'These methods...', simplified_markdown: 'These methods...', readability_score: 78 }) },
    '/batch': { req: { pages: [{ html: '<h1>Page A</h1>', base_url: 'https://a.com' }, { html: '<h1>Page B</h1>', base_url: 'https://b.com' }] }, resp: re({ count: 2, results: [{ markdown: '# Page A', word_count: 2, quality_score: 70 }, { markdown: '# Page B', word_count: 2, quality_score: 70 }] }) }
  },
  'url-metadata': {
    '/fetch': { req: { url: 'https://stripe.com' }, resp: re({ url: 'https://stripe.com', final_url: 'https://stripe.com', title: 'Stripe | Financial Infrastructure for the Internet', description: 'Millions of companies use Stripe to accept payments.', content_type: 'text/html', status_code: 200, load_time_ms: 312 }) },
    '/og-tags': { req: { url: 'https://stripe.com' }, resp: re({ og: { title: 'Stripe', description: 'Financial Infrastructure for the Internet', image: 'https://stripe.com/img/og.png', type: 'website' }, twitter: { card: 'summary_large_image', title: 'Stripe', description: 'Financial Infrastructure' }, missing_tags: [] }) },
    '/analyze': { req: { url: 'https://stripe.com' }, resp: re({ safety_score: 99, is_safe: true, malware_indicator: false, phishing_indicator: false, domain_age_days: 5840 }) },
    '/execution-gate': { req: { url: 'https://stripe.com', objective: 'preview' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/url-intelligence': { req: { url: 'https://stripe.com' }, resp: re({ title: 'Stripe | Financial Infrastructure for the Internet', description: 'Millions of companies use Stripe to accept payments.', og_image: 'https://stripe.com/img/og.png', is_safe: true, social_preview: { title: 'Stripe', description: 'Financial Infrastructure for the Internet', image: 'https://stripe.com/img/og.png' } }, true) },
    '/link-preview': { req: { url: 'https://stripe.com' }, resp: re({ preview: { title: 'Stripe', description: 'Financial Infrastructure for the Internet', image: 'https://stripe.com/img/og.png', favicon: 'https://stripe.com/favicon.ico', domain: 'stripe.com' }, embed_html: '<div class="link-preview">...</div>' }) },
    '/batch': { req: { urls: ['https://stripe.com', 'https://vercel.com'] }, resp: re({ count: 2, results: [{ url: 'https://stripe.com', title: 'Stripe', is_safe: true, status_code: 200 }, { url: 'https://vercel.com', title: 'Vercel', is_safe: true, status_code: 200 }] }) }
  },
  'insider-trades': {
    '/lookup': { req: { ticker: 'NVDA', lookback_days: 30 }, resp: re({ ticker: 'NVDA', company_name: 'NVIDIA Corporation', trades: [{ insider_name: 'Jensen Huang', title: 'CEO', transaction_type: 'sell', shares: 240000, value_usd: 112800000, date: '2026-05-01' }], total_trades: 1 }) },
    '/signals': { req: { ticker: 'NVDA' }, resp: re({ signal: 'bearish', signal_strength: 'moderate', buy_sell_ratio: 0.1, net_value_usd: -112800000 }) },
    '/summary': { req: { ticker: 'NVDA', period: '90d' }, resp: re({ total_buys: 0, total_sells: 3, net_activity_usd: -145000000, most_active_insider: 'Jensen Huang' }) },
    '/execution-gate': { req: { ticker: 'NVDA', objective: 'trade-signal' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/insider-intelligence': { req: { ticker: 'NVDA' }, resp: re({ overall_signal: 'bearish', notable_transactions: [{ insider_name: 'Jensen Huang', transaction_type: 'sell', value_usd: 112800000 }], investment_implication: 'Heavy insider selling may signal valuation concern at current levels.', confidence_level: 'medium' }, true) },
    '/trend': { req: { ticker: 'NVDA', months: 6 }, resp: re({ trend: 'increasing-sells', momentum_score: 62, predictive_signal: 'Continued selling pressure from insiders over 6-month period.' }) },
    '/batch': { req: { tickers: ['NVDA', 'AAPL', 'MSFT'] }, resp: re({ count: 3, results: [{ ticker: 'NVDA', signal: 'bearish', net_value_usd: -145000000 }, { ticker: 'AAPL', signal: 'neutral', net_value_usd: -2000000 }, { ticker: 'MSFT', signal: 'bullish', net_value_usd: 5400000 }] }) }
  },
  'etf-holdings': {
    '/lookup': { req: { ticker: 'QQQ' }, resp: re({ ticker: 'QQQ', name: 'Invesco QQQ Trust', issuer: 'Invesco', aum_usd: 210000000000, expense_ratio: 0.002, inception_date: '1999-03-10', top_holdings: [{ symbol: 'MSFT', name: 'Microsoft', weight_pct: 8.9 }, { symbol: 'AAPL', name: 'Apple', weight_pct: 8.4 }] }) },
    '/top-holdings': { req: { ticker: 'QQQ', limit: 5 }, resp: re({ ticker: 'QQQ', top_holdings: [{ symbol: 'MSFT', name: 'Microsoft', weight_pct: 8.9 }, { symbol: 'AAPL', name: 'Apple', weight_pct: 8.4 }], concentration_top10_pct: 54.2 }) },
    '/sector-breakdown': { req: { ticker: 'QQQ' }, resp: re({ ticker: 'QQQ', sector_allocation: [{ sector: 'Technology', weight_pct: 62.1 }, { sector: 'Consumer Discretionary', weight_pct: 18.4 }], geography_allocation: [{ country: 'United States', weight_pct: 96.2 }], top_sector: 'Technology', top_geography: 'United States' }) },
    '/execution-gate': { req: { ticker: 'QQQ', objective: 'portfolio-analysis' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/etf-intelligence': { req: { ticker: 'QQQ' }, resp: re({ name: 'Invesco QQQ Trust', expense_ratio: 0.002, top_10_holdings: [{ symbol: 'MSFT', weight_pct: 8.9 }], sector_allocation: [{ sector: 'Technology', weight_pct: 62.1 }], investment_thesis: 'High-conviction large-cap tech growth exposure with minimal cost.' }, true) },
    '/compare': { req: { ticker_a: 'QQQ', ticker_b: 'SPY' }, resp: re({ comparison: { overlap_pct: 68.2, expense_ratio_diff: -0.0007, performance_difference: 'QQQ outperformed SPY by 8.2% in trailing 12 months' }, recommendation: 'QQQ for tech-focused growth; SPY for broad diversification' }) },
    '/batch': { req: { tickers: ['QQQ', 'SPY', 'VOO'] }, resp: re({ count: 3, results: [{ ticker: 'QQQ', name: 'Invesco QQQ Trust', aum_usd: 210000000000, expense_ratio: 0.002 }, { ticker: 'SPY', name: 'SPDR S&P 500 ETF', aum_usd: 520000000000, expense_ratio: 0.0009 }, { ticker: 'VOO', name: 'Vanguard S&P 500', aum_usd: 460000000000, expense_ratio: 0.0003 }] }) }
  },
  'wallet-balance': {
    '/lookup': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' }, resp: re({ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum', native_balance: '1523.42', native_balance_usd: 5847149.58, token_count: 14 }) },
    '/portfolio': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' }, resp: re({ tokens: [{ symbol: 'USDC', balance: '2000000', value_usd: 2000000, contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }], total_value_usd: 7847149.58, chain_count: 1 }) },
    '/history': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum', days: 30 }, resp: re({ history: [{ date: '2026-04-17', value_usd: 6200000 }, { date: '2026-05-17', value_usd: 7847149 }], peak_value_usd: 8100000, current_value_usd: 7847149, pnl_30d_pct: 26.6 }) },
    '/execution-gate': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', objective: 'compliance-check' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/wallet-intelligence': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' }, resp: re({ total_value_usd: 7847149.58, wallet_type: 'eoa', risk_profile: 'moderate', notable_holdings: ['ETH', 'USDC', 'UNI'] }, true) },
    '/net-worth': { req: { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }, resp: re({ net_worth_usd: 7847149.58, breakdown: { tokens: 7847149, nfts: 0, defi_positions: 0 }, largest_position: { symbol: 'ETH', value_usd: 5847149, pct_of_total: 74.5 } }) },
    '/batch': { req: { addresses: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'] }, resp: re({ count: 1, results: [{ address: '0xd8dA...045', native_balance_usd: 5847149, total_value_usd: 7847149, wallet_type: 'eoa' }] }) }
  },
  'gas-fee': {
    '/current': { req: { chain: 'ethereum' }, resp: re({ chain: 'ethereum', base_fee_gwei: 12.4, priority_fee_gwei: { slow: 0.5, standard: 1.2, fast: 2.8 }, network_congestion: 'moderate' }) },
    '/estimate': { req: { chain: 'ethereum', transaction_type: 'erc20-transfer' }, resp: re({ estimates: { slow_usd: 0.87, standard_usd: 1.43, fast_usd: 2.21 }, recommended_speed: 'standard', eth_price_usd: 3840 }) },
    '/history': { req: { chain: 'ethereum', hours: 24 }, resp: re({ average_gwei: 14.2, cheapest_time: '03:00 UTC', most_expensive_time: '16:00 UTC', trend: 'falling' }) },
    '/execution-gate': { req: { chain: 'ethereum', objective: 'estimate-cost' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/gas-intelligence': { req: { chain: 'ethereum', transaction_type: 'swap' }, resp: re({ recommended_fee_gwei: 13.6, recommended_fee_usd: 2.14, congestion: 'moderate', best_time_to_transact: '03:00 UTC (low traffic window)' }, true) },
    '/optimize': { req: { chain: 'ethereum', transaction_type: 'swap', urgency: 'low' }, resp: re({ strategy: 'Wait for off-peak window (03:00–05:00 UTC) and use slow fee tier', optimal_fee_usd: 0.87, potential_savings_usd: 1.34, wait_time_minutes: 180 }) },
    '/batch': { req: { transactions: [{ chain: 'ethereum', transaction_type: 'erc20-transfer' }, { chain: 'polygon', transaction_type: 'erc20-transfer' }] }, resp: re({ count: 2, results: [{ chain: 'ethereum', recommended_fee_usd: 1.43, network_congestion: 'moderate' }, { chain: 'polygon', recommended_fee_usd: 0.002, network_congestion: 'low' }] }) }
  },
  'token-metadata': {
    '/lookup': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ symbol: 'USDC', name: 'USD Coin', decimals: 6, token_type: 'ERC-20', verified: true, total_supply: '43500000000000000', contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }) },
    '/verify': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ is_verified: true, honeypot_risk: false, trust_score: 99, warnings: [] }) },
    '/social': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, resp: re({ twitter_followers: 495000, telegram_members: 0, community_score: 91, developer_activity: 'high' }) },
    '/execution-gate': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', objective: 'safety-check' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/token-intelligence': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ is_verified: true, trust_score: 99, risk_summary: 'Audited stablecoin by Circle — no material risk factors detected.', key_risks: [] }, true) },
    '/compare': { req: { contract_address_a: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', contract_address_b: '0xdAC17F958D2ee523a2206206994597C13D831ec7', chain: 'ethereum' }, resp: re({ stronger_fundamentals: 'a', key_differences: ['USDC is fully audited; USDT has had historical reserve concerns', 'USDC has higher transparency score'], recommendation: 'USDC (a) for compliance-sensitive workflows' }) },
    '/batch': { req: { tokens: [{ contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }] }, resp: re({ count: 1, results: [{ contract_address: '0xA0b8...eB48', symbol: 'USDC', is_verified: true, trust_score: 99 }] }) }
  },
  'markdown-cleaner': {
    '/clean': { req: { markdown: '# Title\n\n\n\nSome text  \n\nAnother paragraph\n\n\n' }, resp: re({ cleaned_markdown: '# Title\n\nSome text\n\nAnother paragraph', changes_made: ['removed extra blank lines', 'stripped trailing whitespace'], original_length: 52, cleaned_length: 38 }) },
    '/format': { req: { markdown: '# title\n## section\ntext', standard: 'commonmark' }, resp: re({ formatted_markdown: '# Title\n\n## Section\n\ntext', standard_applied: 'commonmark', changes_count: 3 }) },
    '/lint': { req: { markdown: '# Title\n\nText without trailing newline' }, resp: re({ lint_score: 84, issues: [{ line: 3, rule: 'MD047', severity: 'warning', message: 'Files should end with a single newline character' }], error_count: 0, warning_count: 1, passed: true }) },
    '/execution-gate': { req: { markdown: '# Hello', objective: 'lint' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/markdown-intelligence': { req: { markdown: '# API Reference\n\n## Overview\n\nThis API provides...' }, resp: re({ cleaned_markdown: '# API Reference\n\n## Overview\n\nThis API provides...', lint_score: 97, content_type: 'documentation', quality_assessment: 'Well-structured technical documentation with consistent heading hierarchy.' }, true) },
    '/extract-structure': { req: { markdown: '# Guide\n\n## Setup\n\nInstall with npm.\n\n## Usage\n\nCall the API.' }, resp: re({ table_of_contents: ['# Guide', '## Setup', '## Usage'], sections: [{ heading: 'Setup', level: 2, word_count: 3 }, { heading: 'Usage', level: 2, word_count: 3 }], heading_count: 3 }) },
    '/batch': { req: { documents: [{ markdown: '# Doc A\n\n\nContent' }, { markdown: '# Doc B\nContent' }] }, resp: re({ count: 2, results: [{ cleaned_markdown: '# Doc A\n\nContent', lint_score: 91, passed: true }, { cleaned_markdown: '# Doc B\n\nContent', lint_score: 88, passed: true }] }) }
  },
  'thumbnail-analysis': {
    '/analyze': { req: { image_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', context: 'YouTube tech tutorial' }, resp: re({ visual_quality: 'good', composition_score: 74, text_readability: 'high', color_contrast: 'strong', face_detected: true }) },
    '/score': { req: { image_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', platform: 'youtube', niche: 'tech' }, resp: re({ ctr_score: 71, grade: 'B', score_breakdown: { visual_appeal: 78, text_clarity: 82, emotional_hook: 65, platform_fit: 70 } }) },
    '/suggest': { req: { image_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', goal: 'maximize-ctr' }, resp: re({ suggestions: [{ suggestion: 'Add a bold contrasting text overlay with a number or hook', impact: 'high', difficulty: 'easy' }, { suggestion: 'Increase face size and add an expressive reaction', impact: 'medium', difficulty: 'medium' }], priority_fix: 'Add text overlay with hook', expected_improvement: '+12–18% CTR' }) },
    '/execution-gate': { req: { image_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', objective: 'score' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/thumbnail-intelligence': { req: { image_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', platform: 'youtube' }, resp: re({ ctr_score: 71, grade: 'B', top_issues: ['weak text hook', 'low emotional intensity'], quick_wins: ['add bold overlay text', 'brighten background'], platform_fit: 'good' }, true) },
    '/compare': { req: { image_url_a: 'https://img.youtube.com/vi/aaaa/maxresdefault.jpg', image_url_b: 'https://img.youtube.com/vi/bbbb/maxresdefault.jpg', platform: 'youtube' }, resp: re({ winner: 'a', scores: { a: 78, b: 63 }, win_reason: 'Thumbnail A has stronger text contrast and a clearer subject focus' }) },
    '/batch': { req: { thumbnails: [{ image_url: 'https://img.youtube.com/vi/aaaa/maxresdefault.jpg', platform: 'youtube' }] }, resp: re({ count: 1, results: [{ image_url: 'https://img.youtube.com/vi/aaaa/maxresdefault.jpg', ctr_score: 78, grade: 'B' }] }) }
  },
  'trend-velocity': {
    '/measure': { req: { topic: 'AI agents', region: 'US', timeframe: '7d' }, resp: re({ velocity_score: 89, momentum: 'accelerating', growth_rate: 142.3, peak_date: '2026-05-22' }) },
    '/forecast': { req: { topic: 'AI agents', horizon_days: 14 }, resp: re({ forecast_direction: 'up', peak_window: '2026-05-20 to 2026-05-28', confidence_level: 0.82, projected_growth_pct: 38 }) },
    '/signals': { req: { topic: 'AI agents', signal_types: ['search', 'social', 'news'] }, resp: re({ signals: [{ signal: 'Google Trends spike +340%', source: 'search', strength: 'strong' }, { signal: '#AIagents trending on X', source: 'social', strength: 'strong' }], signal_strength: 'strong', actionable_insight: 'Publish AI agents content immediately — peak window opens in 3 days.' }) },
    '/execution-gate': { req: { topic: 'AI agents', objective: 'content-strategy' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/trend-intelligence': { req: { topic: 'AI agents', region: 'US' }, resp: re({ velocity_score: 89, momentum: 'accelerating', forecast_direction: 'up', opportunity_window: '2026-05-20 to 2026-05-28', action_recommendation: 'Publish now — trend is accelerating toward a short peak window.' }, true) },
    '/breakout': { req: { category: 'AI', region: 'US', min_velocity: 60 }, resp: re({ breakout_topics: [{ topic: 'AI agents', velocity_score: 89, growth_rate: 142.3 }, { topic: 'vibe coding', velocity_score: 76, growth_rate: 98.1 }], top_breakout: 'AI agents' }) },
    '/batch': { req: { topics: ['AI agents', 'quantum computing', 'spatial computing'] }, resp: re({ count: 3, results: [{ topic: 'AI agents', velocity_score: 89, momentum: 'accelerating' }, { topic: 'quantum computing', velocity_score: 52, momentum: 'stable' }, { topic: 'spatial computing', velocity_score: 61, momentum: 'accelerating' }] }) }
  },
  'virality-score': {
    '/score': { req: { content: 'Scientists discover AI can predict earthquakes 72 hours in advance with 94% accuracy', platform: 'twitter', content_type: 'factual' }, resp: re({ virality_score: 84, grade: 'A', score_breakdown: { emotional_hook: 88, shareability: 91, novelty: 92, timing: 72 } }) },
    '/predict': { req: { content: 'Scientists discover AI can predict earthquakes...', platform: 'twitter', audience_size: 50000 }, resp: re({ predicted_shares: 8400, share_velocity: 'fast', reach_multiplier: 4.2, estimated_impressions: 210000 }) },
    '/analyze': { req: { content: 'Scientists discover AI can predict earthquakes...', platform: 'twitter' }, resp: re({ primary_emotion: 'awe', emotion_scores: { awe: 0.82, fear: 0.61, surprise: 0.74, joy: 0.23 }, engagement_drivers: ['novel scientific finding', 'safety relevance', 'AI narrative', 'high-precision claim'] }) },
    '/execution-gate': { req: { content: 'Scientists discover AI...', objective: 'publish' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/virality-intelligence': { req: { content: 'Scientists discover AI can predict earthquakes...', platform: 'twitter', content_type: 'factual' }, resp: re({ virality_score: 84, grade: 'A', primary_emotion: 'awe', share_potential: 'high', top_improvements: ['add a statistic in the first 5 words', 'include a question to drive replies'] }, true) },
    '/optimize': { req: { content: 'Scientists discover AI can predict earthquakes...', platform: 'twitter', target_score: 90 }, resp: re({ suggestions: ['Open with the number: "94% accurate"', 'Add a rhetorical question to end'], rewritten_hook: '94% accurate: AI now predicts earthquakes 72 hours out. How does it work?', expected_improvement: '+6 virality score points' }) },
    '/batch': { req: { items: [{ content: 'Post A text', platform: 'twitter' }, { content: 'Post B text', platform: 'linkedin' }] }, resp: re({ count: 2, results: [{ virality_score: 84, grade: 'A', primary_emotion: 'awe' }, { virality_score: 67, grade: 'B', primary_emotion: 'joy' }] }) }
  },
  'blockchain-tx-lookup': {
    '/lookup': { req: { tx_hash: '0xabc123...', chain: 'ethereum' }, resp: re({ tx_hash: '0xabc123...', status: 'confirmed', value_usd: 45230.50, transaction_type: 'erc20-transfer', from_address: '0xSender...', to_address: '0xReceiver...', block_number: 19834521, timestamp: '2026-05-17T11:42:00Z' }) },
    '/decode': { req: { tx_hash: '0xabc123...', chain: 'ethereum' }, resp: re({ method_name: 'transfer', decoded_params: [{ name: 'to', type: 'address', value: '0xReceiver...' }, { name: 'amount', type: 'uint256', value: '45230500000' }], protocol: 'ERC-20' }) },
    '/trace': { req: { tx_hash: '0xabc123...', chain: 'ethereum' }, resp: re({ internal_txs: [], token_transfers: [{ token: 'USDC', from: '0xSender...', to: '0xReceiver...', amount: '45230.5' }], protocols_used: ['ERC-20'] }) },
    '/execution-gate': { req: { tx_hash: '0xabc123...', objective: 'compliance' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/tx-intelligence': { req: { tx_hash: '0xabc123...', chain: 'ethereum' }, resp: re({ status: 'confirmed', action_summary: 'USDC transfer of $45,230 from known wallet to exchange deposit address.', risk_level: 'safe', is_suspicious: false }, true) },
    '/risk': { req: { tx_hash: '0xabc123...', chain: 'ethereum' }, resp: re({ risk_score: 8, risk_level: 'safe', risk_flags: [], recommended_action: 'No action required — transaction is clean.' }) },
    '/batch': { req: { tx_hashes: ['0xabc123...', '0xdef456...'], chain: 'ethereum' }, resp: re({ count: 2, results: [{ tx_hash: '0xabc123...', status: 'confirmed', risk_level: 'safe', is_suspicious: false }, { tx_hash: '0xdef456...', status: 'confirmed', risk_level: 'caution', is_suspicious: true }] }) }
  },
  'defi-pool-data': {
    '/lookup': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', chain: 'ethereum' }, resp: re({ protocol: 'Uniswap V3', pair: 'USDC/ETH', tvl_usd: 182000000, volume_24h_usd: 48000000, apy_7d: 14.2, fee_tier: 0.0005 }) },
    '/apy': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', chain: 'ethereum' }, resp: re({ apy_7d: 14.2, apy_30d: 12.8, fee_apy: 14.2, reward_apy: 0, impermanent_loss_risk: 'moderate' }) },
    '/liquidity': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', chain: 'ethereum', amount_usd: 100000 }, resp: re({ tvl_usd: 182000000, liquidity_depth: 'deep', slippage_1k: 0.001, slippage_100k: 0.08, slippage_1m: 0.81 }) },
    '/execution-gate': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', objective: 'enter-position' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/pool-intelligence': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', chain: 'ethereum' }, resp: re({ tvl_usd: 182000000, apy_7d: 14.2, risk_score: 22, entry_recommendation: 'enter' }, true) },
    '/risk': { req: { pool_address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', chain: 'ethereum' }, resp: re({ risk_score: 22, risk_level: 'low', smart_contract_risk: 'audited', rug_pull_risk: 'low' }) },
    '/batch': { req: { pools: [{ pool_address: '0x88e6A0c2...5640', chain: 'ethereum' }] }, resp: re({ count: 1, results: [{ pool_address: '0x88e6A0c2...5640', tvl_usd: 182000000, apy_7d: 14.2, risk_level: 'low' }] }) }
  },
  'token-risk-lite': {
    '/assess': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ risk_score: 4, risk_level: 'safe', honeypot: false, rug_pull_risk: 'low' }) },
    '/score': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ risk_score: 4, grade: 'A', score_breakdown: { contract_safety: 98, liquidity: 100, ownership: 99, trading_pattern: 97 } }) },
    '/flags': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ flags: [], critical_count: 0, overall_verdict: 'safe' }) },
    '/execution-gate': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', objective: 'pre-trade-check' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/risk-intelligence': { req: { contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' }, resp: re({ risk_score: 4, grade: 'A', honeypot: false, critical_flags: [], user_verdict: 'SAFE', explanation: 'USDC is a regulated, fully-audited stablecoin with no risk factors detected.' }, true) },
    '/compare': { req: { contract_address_a: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', contract_address_b: '0xSomeNewToken...', chain: 'ethereum' }, resp: re({ risk_scores: { a: 4, b: 78 }, grades: { a: 'A', b: 'D' }, lower_risk: 'a' }) },
    '/batch': { req: { tokens: [{ contract_address: '0xA0b86991...', chain: 'ethereum' }, { contract_address: '0xSomeNewToken...', chain: 'ethereum' }] }, resp: re({ count: 2, results: [{ contract_address: '0xA0b86991...', risk_score: 4, grade: 'A', honeypot: false }, { contract_address: '0xSomeNewToken...', risk_score: 78, grade: 'D', honeypot: true }] }) }
  },
  'onchain-labeling': {
    '/label': { req: { address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'ethereum' }, resp: re({ label: 'Binance Hot Wallet', entity_name: 'Binance', entity_type: 'exchange', confidence: 0.99 }) },
    '/classify': { req: { address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'ethereum' }, resp: re({ entity_type: 'exchange', risk_category: 'low-risk', compliance_category: 'regulated-exchange' }) },
    '/verify': { req: { address: '0x28C6c06298d514Db089934071355E5743bf21d60', expected_entity: 'Binance', chain: 'ethereum' }, resp: re({ is_known_entity: true, entity_name: 'Binance', match_confidence: 0.99 }) },
    '/execution-gate': { req: { address: '0x28C6c06298d514Db089934071355E5743bf21d60', objective: 'aml-check' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/label-intelligence': { req: { address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'ethereum' }, resp: re({ label: 'Binance Hot Wallet', entity_type: 'exchange', risk_category: 'low-risk', is_sanctioned: false, action_recommendation: 'No action required — known regulated exchange address.' }, true) },
    '/bulk-label': { req: { addresses: ['0x28C6c0...', '0xd8dA6B...'], chain: 'ethereum' }, resp: re({ count: 2, results: [{ address: '0x28C6c0...', label: 'Binance Hot Wallet', entity_type: 'exchange', risk_category: 'low-risk' }, { address: '0xd8dA6B...', label: 'Vitalik Buterin', entity_type: 'whale', risk_category: 'low-risk' }] }) },
    '/batch': { req: { addresses: [{ address: '0x28C6c0...', chain: 'ethereum' }, { address: '0xd8dA6B...', chain: 'ethereum' }] }, resp: re({ count: 2, results: [{ address: '0x28C6c0...', label: 'Binance Hot Wallet', entity_type: 'exchange', is_sanctioned: false }, { address: '0xd8dA6B...', label: 'Vitalik Buterin', entity_type: 'whale', is_sanctioned: false }] }) }
  },
  'smart-contract-decoder': {
    '/decode': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', chain: 'ethereum' }, resp: re({ contract_name: 'UniswapV2Router02', functions: [{ name: 'swapExactTokensForTokens', signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', is_payable: false }], is_proxy: false, implementation_address: null }) },
    '/analyze': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', chain: 'ethereum' }, resp: re({ contract_type: 'DEX Router', purpose: 'Facilitates token swaps on Uniswap V2 protocol', admin_controls: 'minimal', upgradability: 'immutable' }) },
    '/audit': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', chain: 'ethereum' }, resp: re({ risk_score: 12, is_verified: true, vulnerabilities: [] }) },
    '/execution-gate': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', objective: 'interact' }, resp: re({ ready: true, gate_passed: true, blocking_reason: null }) },
    '/contract-intelligence': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', chain: 'ethereum' }, resp: re({ contract_type: 'DEX Router', risk_level: 'safe', safe_to_interact: true, interaction_warnings: [] }, true) },
    '/functions': { req: { contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', chain: 'ethereum' }, resp: re({ function_count: 18, functions: [{ name: 'swapExactTokensForTokens', signature: '...', is_payable: false, is_admin: false }], admin_functions: [], dangerous_functions: [] }) },
    '/batch': { req: { contracts: [{ contract_address: '0x7a250d5630...', chain: 'ethereum' }] }, resp: re({ count: 1, results: [{ contract_address: '0x7a250d5630...', contract_type: 'DEX Router', risk_level: 'safe', safe_to_interact: true }] }) }
  }
};

function applyExamples(spec, slug) {
  const apiExamples = EXAMPLES[slug];
  if (!apiExamples) return;
  for (const [path, ex] of Object.entries(apiExamples)) {
    const op = spec.paths?.[path]?.post;
    if (!op) continue;
    if (ex.req && op.requestBody?.content?.['application/json']) {
      op.requestBody.content['application/json'].example = ex.req;
    }
    if (ex.resp && op.responses?.['200']?.content?.['application/json']) {
      op.responses['200'].content['application/json'].example = ex.resp;
    }
  }
}

// ── MAIN LOOP ────────────────────────────────────────────────────────────────
const slugs = [
  'crm-contact-intelligence','founder-background','executive-risk','decision-maker-fit',
  'html-to-markdown','url-metadata','insider-trades','etf-holdings',
  'wallet-balance','gas-fee','token-metadata','markdown-cleaner',
  'thumbnail-analysis','trend-velocity','virality-score',
  'blockchain-tx-lookup','defi-pool-data','token-risk-lite',
  'onchain-labeling','smart-contract-decoder'
];

let done = 0;
for (const slug of slugs) {
  const file = `${slug}-api-openapi.json`;
  const spec = JSON.parse(readFileSync(file));

  // 1. Format fields
  applyFormats(spec);

  // 2. Required in nested objects
  applyNestedRequired(spec);

  // 3. Endpoint-level pricing
  applyEndpointPricing(spec, slug);

  // 4. Examples
  applyExamples(spec, slug);

  // 5. Compliance notice for people-data APIs
  if (PEOPLE_APIS.includes(slug)) {
    spec.info['x-compliance-notice'] = COMPLIANCE_NOTICE;
  }

  writeFileSync(file, JSON.stringify(spec, null, 2));
  console.log(`✓ ${file}`);
  done++;
}
console.log(`\nPolished ${done} files.`);
