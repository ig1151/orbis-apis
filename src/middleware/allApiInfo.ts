import { nftMetadataInfoRouter } from '../routes/nft-metadata/info';
import { createApiInfoRouter } from './apiInfo';

export const gasOptimizerInfoRouter = createApiInfoRouter({
  name: 'Gas Optimizer API', slug: 'gas-optimizer', version: '1.0.0',
  description: 'Real-time gas price data and optimization recommendations across EVM chains.',
  category: 'Crypto Infrastructure',
  endpoints: [
    { method: 'GET', path: '/now', description: 'Get current gas prices', params: { chain: 'ethereum | polygon | arbitrum | optimism | base | bsc | avalanche' } },
    { method: 'GET', path: '/estimate', description: 'Estimate gas cost for a transaction', params: { chain: 'Chain name', txType: 'transfer | swap | nftMint' } },
    { method: 'GET', path: '/compare', description: 'Compare gas across chains' },
    { method: 'GET', path: '/timing', description: 'Best time to transact', params: { chain: 'Chain name' } },
  ],
});

export const fundingRateInfoRouter = createApiInfoRouter({
  name: 'Funding Rate API', slug: 'funding-rate', version: '1.0.0',
  description: 'Real-time and historical funding rates across crypto derivatives exchanges.',
  category: 'Crypto Derivatives',
  endpoints: [
    { method: 'GET', path: '/rates/now', description: 'Get current funding rates', params: { symbol: 'BTC | ETH | SOL etc', exchanges: 'Comma-separated exchange filter' } },
    { method: 'GET', path: '/rates/compare', description: 'Compare funding rates across exchanges', params: { symbol: 'Token symbol' } },
    { method: 'GET', path: '/rates/extremes', description: 'Get highest and lowest funding rates' },
    { method: 'GET', path: '/rates/signal', description: 'AI funding rate signal', params: { symbol: 'Token symbol' } },
  ],
});

export const strategySignalInfoRouter = createApiInfoRouter({
  name: 'Strategy Signal API', slug: 'strategy-signal', version: '1.0.0',
  description: 'AI-powered trading strategy signals combining on-chain and market data.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/', description: 'Get strategy signal', params: { symbol: 'Token symbol e.g. BTC' } },
  ],
});

export const predictionMarketInfoRouter = createApiInfoRouter({
  name: 'Prediction Market API', slug: 'prediction-market', version: '1.0.0',
  description: 'Access Polymarket prediction market data, signals, and AI analysis.',
  category: 'Prediction Markets',
  endpoints: [
    { method: 'GET', path: '/trending', description: 'Get trending prediction markets' },
    { method: 'GET', path: '/search', description: 'Search prediction markets', params: { q: 'Search query' } },
    { method: 'GET', path: '/detail/:id', description: 'Get specific market by slug' },
    { method: 'GET', path: '/signal', description: 'AI signal for a market', params: { id: 'Market ID' } },
  ],
});

export const tokenScreenerInfoRouter = createApiInfoRouter({
  name: 'Token Screener API', slug: 'token-screener', version: '1.0.0',
  description: 'Screen and filter tokens by market cap, volume, momentum and on-chain metrics.',
  category: 'Crypto Research',
  endpoints: [
    { method: 'GET', path: '/screen', description: 'Screen tokens', params: { filter: 'trending | gainers | losers', chain: 'Chain filter', limit: 'Number of results' } },
    { method: 'GET', path: '/movers', description: 'Top movers by price change' },
    { method: 'GET', path: '/opportunities', description: 'AI-identified token opportunities' },
  ],
});

export const tokenUnlockInfoRouter = createApiInfoRouter({
  name: 'Token Unlock API', slug: 'token-unlock', version: '1.0.0',
  description: 'Track upcoming token unlock events, vesting schedules, and price impact analysis.',
  category: 'Crypto Research',
  endpoints: [
    { method: 'GET', path: '/upcoming', description: 'Get upcoming token unlocks', params: { days: 'Lookahead days (default 30)' } },
    { method: 'GET', path: '/vesting/:symbol', description: 'Unlock schedule for a specific token' },
    { method: 'GET', path: '/impact', description: 'AI price impact analysis' },
    { method: 'GET', path: '/calendar', description: 'Calendar view of unlock events' },
  ],
});

export const agentIdentityInfoRouter = createApiInfoRouter({
  name: 'Agent Identity API', slug: 'agent-identity', version: '2.0.0',
  description: 'Identity, verification, reputation, and attestation layer for autonomous AI agents. Create, verify, and look up persistent on-chain identities for AI agents, including reputation scores, trust signals, and signed attestations for marketplace and multi-agent workflows.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/generate', description: 'Create a new persistent on-chain identity for an AI agent. Returns DID, public key, wallet address, and initial trust metadata.' },
    { method: 'POST', path: '/verify', description: 'Verify an existing agent identity. Updates verification status, reputation score, and trust level.' },
    { method: 'GET', path: '/reputation', description: 'Get full reputation profile: score, trust level, attestation count, claim breakdown, and score history.', params: { agentId: 'Agent ID' } },
    { method: 'POST', path: '/attest', description: 'Issue a signed attestation for capability, ownership, reputation, permission, or compliance claims. Updates reputation score.' },
    { method: 'GET', path: '/:agentId', description: 'Look up full agent identity record including DID, keys, reputation, and recent attestations.' },
  ],
});

export const cryptoNarrativeInfoRouter = createApiInfoRouter({
  name: 'Crypto Narrative API', slug: 'crypto-narrative', version: '1.0.0',
  description: 'AI-powered crypto narrative detection, trending themes, and market story analysis.',
  category: 'AI Research',
  endpoints: [
    { method: 'GET', path: '/trending', description: 'Get trending crypto narratives' },
    { method: 'GET', path: '/:name', description: 'Deep dive into a specific narrative' },
    { method: 'GET', path: '/compare', description: 'Compare narrative strength', params: { a: 'First narrative', b: 'Second narrative' } },
    { method: 'GET', path: '/scan', description: 'Scan all active narratives' },
  ],
});

export const defiRiskInfoRouter = createApiInfoRouter({
  name: 'DeFi Risk API', slug: 'defi-risk', version: '1.0.0',
  description: 'Smart contract security, protocol risk, and DeFi portfolio risk analysis.',
  category: 'DeFi Security',
  endpoints: [
    { method: 'GET', path: '/token-safety', description: 'Token safety check', params: { contract: 'Token contract address', chain: 'Chain name' } },
    { method: 'GET', path: '/protocol', description: 'Protocol risk assessment', params: { protocol: 'Protocol name' } },
    { method: 'GET', path: '/liquidity', description: 'Liquidity health check', params: { protocol: 'Protocol name' } },
    { method: 'GET', path: '/portfolio', description: 'Portfolio risk scan', params: { address: 'Wallet address' } },
  ],
});

export const cryptoAlertsInfoRouter = createApiInfoRouter({
  name: 'Crypto Alerts API', slug: 'crypto-alerts', version: '1.0.0',
  description: 'Create and manage price alerts, whale activity notifications, and market triggers.',
  category: 'Crypto Monitoring',
  endpoints: [
    { method: 'POST', path: '/create', description: 'Create a new alert' },
    { method: 'GET', path: '/check', description: 'Check triggered alerts' },
    { method: 'GET', path: '/feed', description: 'Get alert feed' },
    { method: 'GET', path: '/whale', description: 'Whale activity alerts', params: { chain: 'Chain name', minUsd: 'Minimum USD threshold' } },
    { method: 'GET', path: '/summary', description: 'Alert summary and statistics' },
  ],
});

export const agentSkillsInfoRouter = createApiInfoRouter({
  name: 'Agent Skills Routing API', slug: 'agent-skills', version: '2.0.0',
  description: 'Discover, match, compose, and route agent skills for autonomous workflows. Register skills, match them to requests, and compose ordered skill sequences for any agent task.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/compose', description: 'Given a task, return an ordered sequence of skills needed to complete it with dependencies, duration estimates, and execution order.' },
    { method: 'POST', path: '/match', description: 'Match the best skills from the registry to a specific agent request.' },
    { method: 'POST', path: '/register', description: 'Register a new agent skill in the marketplace.' },
    { method: 'GET', path: '/discover', description: 'Discover available skills by query, category, or tags.', params: { query: 'Search query', category: 'Skill category' } },
    { method: 'GET', path: '/:skillId', description: 'Get full details for a specific skill.' },
    { method: 'GET', path: '/trending', description: 'Get trending skills ranked by recent invocation count.' },
  ],
});

export const defiPositionInfoRouter = createApiInfoRouter({
  name: 'DeFi Position Monitor API', slug: 'defi-position-monitor', version: '1.0.0',
  description: 'Monitor DeFi positions, health factors, and liquidation risks across protocols.',
  category: 'DeFi Monitoring',
  endpoints: [
    { method: 'GET', path: '/aave', description: 'Scan Aave positions', params: { address: 'Wallet address' } },
    { method: 'GET', path: '/scan', description: 'Full position scan', params: { address: 'Wallet address' } },
    { method: 'POST', path: '/alert', description: 'Set position health alert' },
  ],
});

export const walletPortfolioInfoRouter = createApiInfoRouter({
  name: 'Wallet Portfolio API', slug: 'wallet-portfolio', version: '1.0.0',
  description: 'Comprehensive wallet portfolio analysis, PnL tracking, and risk scoring.',
  category: 'Wallet Analytics',
  endpoints: [
    { method: 'GET', path: '/snapshot', description: 'Get portfolio snapshot', params: { address: 'Wallet address' } },
    { method: 'GET', path: '/pnl', description: 'Portfolio PnL analysis', params: { address: 'Wallet address' } },
    { method: 'GET', path: '/score', description: 'Portfolio risk score', params: { address: 'Wallet address' } },
  ],
});

export const crossChainInfoRouter = createApiInfoRouter({
  name: 'Agent Cross-Chain Execution & Bridge Intelligence API', slug: 'cross-chain-bridge', version: '2.0.0',
  description: 'Real-time cross-chain bridge intelligence for autonomous agents. Compare routes, score bridges, estimate slippage, monitor conditions, and gate execution — powered by live LI.FI data across 30+ chains. Designed for DeFi agents, portfolio rebalancers, and execution pipelines.',
  category: 'blockchain-web3',
  loop_type: 'compare_score_estimate_monitor_gate_execute',
  monetization_grade: 'A',
  primary_use_case: 'Agent cross-chain bridge selection and execution gating',
  pricing: {
    '/compare-routes': 0.003,
    '/score-route': 0.0025,
    '/estimate-slippage': 0.002,
    '/monitor-bridge': 0.002,
    '/execution-gate': 0.0045
  },
  endpoints: [
    { method: 'POST', path: '/compare-routes', description: 'Compare bridge routes with AI scoring: value, speed, safety scores and recommendation.' },
    { method: 'POST', path: '/score-route', description: 'Score a bridge route across fee, speed, safety, liquidity. Returns grade and safe_to_use.' },
    { method: 'POST', path: '/estimate-slippage', description: 'Estimate slippage and total cost for a cross-chain transfer. Returns slippage_level and safe_to_proceed.' },
    { method: 'POST', path: '/monitor-bridge', description: 'Monitor bridge conditions: congestion, fees, liquidity. Returns alert_level and next_check_ms.' },
    { method: 'POST', path: '/execution-gate', description: 'Cross-API execution gate: checks fees and slippage against constraints, returns execute bool and chains to Autopilot.' },
    { method: 'GET', path: '/bridge/chains', description: 'Get all supported chains' },
    { method: 'GET', path: '/bridge/tokens', description: 'Get bridgeable tokens for a chain' },
    { method: 'GET', path: '/bridge/best', description: 'Legacy: best bridge route' },
    { method: 'GET', path: '/bridge/routes', description: 'Legacy: all bridge routes' },
  ],
});

export const derivativesInfoRouter = createApiInfoRouter({
  name: 'Derivatives API', slug: 'derivatives', version: '1.0.0',
  description: 'Options market data including open interest, put/call ratios, and max pain levels.',
  category: 'Crypto Derivatives',
  endpoints: [
    { method: 'GET', path: '/options/summary/:currency', description: 'Options market summary' },
    { method: 'GET', path: '/options/open-interest/:currency', description: 'Open interest data' },
    { method: 'GET', path: '/options/put-call-ratio/:currency', description: 'Put/call ratio' },
    { method: 'GET', path: '/options/max-pain/:currency', description: 'Max pain price level' },
  ],
});

export const marketCorrelationInfoRouter = createApiInfoRouter({
  name: 'Market Correlation API', slug: 'market-correlation', version: '1.0.0',
  description: 'Crypto asset correlation analysis, matrix generation, and diversification insights.',
  category: 'Market Analytics',
  endpoints: [
    { method: 'GET', path: '/correlation/:asset', description: 'Get correlations for an asset', params: { period: '7d | 30d | 90d' } },
    { method: 'GET', path: '/correlation/:asset/summary', description: 'Correlation summary' },
    { method: 'GET', path: '/correlation/matrix', description: 'Full correlation matrix', params: { assets: 'Comma-separated assets' } },
  ],
});

export const yieldFarmingInfoRouter = createApiInfoRouter({
  name: 'Yield Farming API', slug: 'yield-farming', version: '1.0.0',
  description: 'DeFi yield opportunities, pool analytics, and yield strategy recommendations.',
  category: 'DeFi Analytics',
  endpoints: [
    { method: 'GET', path: '/yields/top', description: 'Top yield opportunities', params: { chain: 'Chain filter', minTvl: 'Minimum TVL in USD' } },
    { method: 'GET', path: '/yields/stable', description: 'Stablecoin yield pools' },
    { method: 'GET', path: '/yields/search', description: 'Search yield pools', params: { query: 'Search term' } },
    { method: 'GET', path: '/yields/chains', description: 'Yields by chain' },
    { method: 'GET', path: '/yields/strategy', description: 'AI yield strategy recommendation' },
    { method: 'GET', path: '/yields/pool/:poolId', description: 'Specific pool details' },
  ],
});

export const tokenomicsInfoRouter = createApiInfoRouter({
  name: 'Tokenomics API', slug: 'tokenomics', version: '1.0.0',
  description: 'Token supply, distribution, vesting, and tokenomics scoring for any crypto asset.',
  category: 'Crypto Research',
  endpoints: [
    { method: 'GET', path: '/tokenomics/:token', description: 'Full tokenomics data' },
    { method: 'GET', path: '/tokenomics/:token/score', description: 'Tokenomics health score' },
    { method: 'GET', path: '/tokenomics/:token/supply', description: 'Supply schedule and inflation' },
    { method: 'GET', path: '/tokenomics/compare', description: 'Compare tokenomics', params: { tokens: 'Comma-separated token symbols' } },
  ],
});

export const liquidationFeedInfoRouter = createApiInfoRouter({
  name: 'Liquidation Feed API', slug: 'liquidation-feed', version: '1.0.0',
  description: 'Real-time liquidation events, at-risk positions, and liquidation volume analytics.',
  category: 'DeFi Monitoring',
  endpoints: [
    { method: 'GET', path: '/v1/liquidations/recent', description: 'Recent liquidation events' },
    { method: 'GET', path: '/v1/liquidations/at-risk', description: 'Positions at risk' },
    { method: 'GET', path: '/v1/liquidations/stats', description: 'Liquidation statistics' },
    { method: 'GET', path: '/v1/liquidations/volume', description: 'Liquidation volume over time' },
  ],
});

export const marketStressInfoRouter = createApiInfoRouter({
  name: 'Market Stress API', slug: 'market-stress', version: '1.0.0',
  description: 'Crypto market stress indicators, fear/greed analysis, and systemic risk detection.',
  category: 'Market Analytics',
  endpoints: [
    { method: 'GET', path: '/v1/stress', description: 'Overall market stress score' },
    { method: 'GET', path: '/v1/stress/:asset', description: 'Stress score for specific asset' },
    { method: 'GET', path: '/v1/stress/scan/top', description: 'Top stressed assets' },
  ],
});

export const walletInfoRouter = createApiInfoRouter({
  name: 'Wallet API', slug: 'wallet', version: '1.0.0',
  description: 'Ethereum wallet balance, token holdings, and transaction history.',
  category: 'Wallet Analytics',
  endpoints: [
    { method: 'GET', path: '/balance/:address', description: 'Get ETH and token balances' },
    { method: 'GET', path: '/tokens/:address', description: 'Get ERC-20 token holdings' },
    { method: 'GET', path: '/transactions/:address', description: 'Get transaction history' },
    { method: 'GET', path: '/portfolio/:address', description: 'Get full wallet portfolio' },
  ],
});

export const stablecoinYieldInfoRouter = createApiInfoRouter({
  name: 'Stablecoin Yield API', slug: 'stablecoin-yield', version: '1.0.0',
  description: 'Find the best stablecoin yield opportunities across DeFi protocols.',
  category: 'DeFi Analytics',
  endpoints: [
    { method: 'GET', path: '/rates', description: 'Get best stablecoin yields', params: { token: 'USDC | USDT | DAI', chain: 'Chain filter', minTvl: 'Minimum TVL' } },
    { method: 'GET', path: '/compare', description: 'Compare yields across stablecoins' },
    { method: 'GET', path: '/best', description: 'Best yield for a stablecoin', params: { token: 'Stablecoin symbol' } },
  ],
});

export const metaStrategyInfoRouter = createApiInfoRouter({
  name: 'Meta Strategy API', slug: 'meta-strategy', version: '1.0.0',
  description: 'AI meta-strategy scanner combining signals from multiple data sources.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/scan', description: 'Scan meta strategies', params: { symbols: 'Comma-separated symbols e.g. BTC,ETH' } },
  ],
});

export const socialSentimentInfoRouter = createApiInfoRouter({
  name: 'Social Sentiment API', slug: 'social-sentiment', version: '1.0.0',
  description: 'Social media sentiment analysis for crypto assets across Twitter, Reddit and more.',
  category: 'Market Analytics',
  endpoints: [
    { method: 'GET', path: '/crypto-sentiment', description: 'Get crypto sentiment scores', params: { symbol: 'Token symbol' } },
    { method: 'GET', path: '/signals', description: 'Sentiment-based trading signals' },
    { method: 'GET', path: '/trending', description: 'Trending crypto topics on social media' },
  ],
});

export const alphaSignalInfoRouter = createApiInfoRouter({
  name: 'Agent Trading Signal & Opportunity Detection API', slug: 'alpha-signal', version: '2.0.0',
  description: 'Real-time alpha signal engine for autonomous agents. Structured machine-readable outputs built for continuous polling loops, decision engines, and execution pipelines. Designed for 6+ calls per agent cycle: scan → filter → score → explain → detect → rank → act.',
  category: 'Agent Trading Infrastructure',
  loop_type: 'scan_filter_score_rank_execute',
  monetization_grade: 'A',
  primary_use_case: 'High-frequency autonomous trading signal loops',
  pricing: {
    'scan-signals': 0.002,
    'filter-signals': 0.0008,
    'score-asset': 0.0015,
    'explain': 0.0025,
    'detect-event': 0.002,
    'rank-opportunities': 0.0035
  },
  endpoints: [
    { method: 'POST', path: '/scan-signals', description: 'Core polling loop — scan up to 10 assets for live signals. Returns action, confidence, entry zone, stop loss, take profit per asset. Call every 1-5 minutes. Alias: /scan' },
    { method: 'POST', path: '/filter-signals', description: 'Filter a signal array by confidence, type, action, urgency, and trend. Call after scan to refine before scoring. High call volume driver.' },
    { method: 'POST', path: '/score-asset', description: 'Composite score for a single asset: trend, momentum, volume, sentiment scores plus regime and bias classification. Alias: /score' },
    { method: 'POST', path: '/detect-event', description: 'Detect significant market events: volume spikes, breakouts, flash crashes, whale moves. Returns impact score, direction, and chain_to hints. Alias: /trigger-event' },
    { method: 'POST', path: '/rank-opportunities', description: 'Rank assets by opportunity score across crypto, defi, l1, l2, or meme universes. Returns top N with risk/reward ratios. Alias: /rank' },
    { method: 'POST', path: '/explain', description: 'Deep explanation of a signal: drivers, confidence breakdown by price/volume/trend/context, risk factors, contra indicators, and concrete action recommendation.' },
    { method: 'GET', path: '/signal/:symbol', description: 'Legacy: single asset signal for ETH, BNB, SOL' },
    { method: 'GET', path: '/signal/batch', description: 'Legacy: batch signals for ETH, BNB, SOL' },
  ],
});

export const actionInfoRouter = createApiInfoRouter({
  name: 'Agent Action Execution API', slug: 'action', version: '2.0.0',
  description: 'Execute structured AI agent actions with machine-readable results, status tracking, retry metadata, and audit history for autonomous workflows.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/execute', description: 'Execute a structured agent action', params: { action_type: 'research | outreach | web_fetch | data_extract | api_call | workflow_step', dry_run: 'true | false' } },
    { method: 'GET', path: '/types', description: 'List supported action types with example payloads' },
    { method: 'GET', path: '/history', description: 'Get recent action execution history' },
    { method: 'GET', path: '/:action_id', description: 'Get result and metadata for a specific action by ID' },
  ],
});

export const agentMemoryInfoRouter = createApiInfoRouter({
  name: 'Agent Memory & Context Engine', slug: 'agent-memory', version: '2.0.0',
  description: 'Structured memory storage, retrieval, compression and extraction for autonomous AI agents. Store tagged memories with importance scores, search by query, compress long histories, and extract facts or entities — optimized for repeated calls in agent loops.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/store', description: 'Store a memory entry with tags and importance score', params: { agent_id: 'Unique agent identifier', content: 'Memory content', tags: 'Array of tags', importance: 'Float 0-1' } },
    { method: 'POST', path: '/retrieve', description: 'Retrieve relevant memories by query and filters', params: { agent_id: 'Agent identifier', query: 'Search query', limit: 'Max results' } },
    { method: 'POST', path: '/search', description: 'Search memories across a session by keyword', params: { session_id: 'Session identifier', query: 'Search query', limit: 'Max results' } },
    { method: 'POST', path: '/compress', description: 'Compress long memory history into a structured summary' },
    { method: 'POST', path: '/extract', description: 'Extract facts, entities or summary from memory content', params: { content: 'Text to extract from', type: 'facts | entities | summary' } },
    { method: 'GET', path: '/sessions', description: 'List all active memory sessions' },
    { method: 'POST', path: '/:session_id', description: 'Add a memory to a session' },
    { method: 'GET', path: '/:session_id', description: 'Get all memories for a session' },
    { method: 'DELETE', path: '/:session_id', description: 'Clear all memories for a session' },
  ],
});

export const agentWorkflowInfoRouter = createApiInfoRouter({
  name: 'Agent Workflow Orchestration API', slug: 'agent-workflow', version: '2.0.0',
  description: 'Plan, execute, monitor, retry, and optimize multi-step workflows for autonomous AI agents. Supports structured step tracking, retry logic, workflow optimization, and pre-built templates for common agent tasks.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/create', description: 'Define a new workflow with name, goal, and step definitions' },
    { method: 'POST', path: '/run', description: 'Execute a workflow by goal or workflow_id. Returns structured step results and metadata.' },
    { method: 'GET', path: '/:workflow_id', description: 'Retrieve full workflow record including steps, result, and metadata' },
    { method: 'GET', path: '/:workflow_id/status', description: 'Get current status and metadata for a workflow' },
    { method: 'POST', path: '/:workflow_id/retry', description: 'Retry a failed workflow. Only available for workflows with status: failed.' },
    { method: 'POST', path: '/:workflow_id/optimize', description: 'Analyze a completed workflow and return optimization suggestions and estimated improvements' },
    { method: 'POST', path: '/decompose', description: 'Decompose a goal into executable steps with type, dependencies, duration estimates, and complexity rating. Returns a ready-to-run workflow plan.' },
    { method: 'GET', path: '/templates', description: 'List all available workflow templates with input/output schemas and step definitions' },
  ],
});

export const autopilotInfoRouter = createApiInfoRouter({
  name: 'Agent Execution Orchestration Engine', slug: 'autopilot', version: '2.0.0',
  description: 'Central agent brain API — the glue layer between all Orbis APIs. Determines next actions, makes decisions between options, gates execution with risk checks, decomposes goals into plans, and recovers from failures. Designed to be called every loop iteration: signal detected → autopilot decides → action executes.',
  category: 'AI Agents',
  loop_type: 'detect_decide_gate_execute_recover',
  monetization_grade: 'A',
  primary_use_case: 'Agent decision orchestration across all APIs',
  pricing: {
    '/next-action': 0.002,
    '/decide': 0.002,
    '/should-execute': 0.0015,
    '/plan': 0.003,
    '/retry-strategy': 0.0015
  },
  endpoints: [
    { method: 'POST', path: '/next-action', description: 'Core loop driver — given context and state, returns the single best next action with confidence, urgency, and chain_to hints. Call every iteration.' },
    { method: 'POST', path: '/decide', description: 'High-frequency decision between multiple options. Returns selected option, confidence, risk score, and rejected alternatives.' },
    { method: 'POST', path: '/should-execute', description: 'Risk gate — determines whether an action should execute. Returns execute bool, risk score, blocking factors, and retry hints.' },
    { method: 'POST', path: '/plan', description: 'Decompose a goal into ordered executable steps with API routing, estimated timing, and complexity rating.' },
    { method: 'POST', path: '/retry-strategy', description: 'Failure recovery — determines retry strategy, delay, max attempts, and whether to escalate or use alternative action.' },
    { method: 'POST', path: '/should-act', description: 'Ultra-lightweight gating check — pure logic, no AI call, sub-millisecond response. Call every step to gate execution. $0.001.' },
    { method: 'POST', path: '/', description: 'Create an autopilot session for portfolio management' },
    { method: 'GET', path: '/:id', description: 'Get session status and config' },
    { method: 'GET', path: '/:id/history', description: 'Get session decision history' },
    { method: 'POST', path: '/:id', description: 'Pause or resume a session (send status: active|paused)' },
    { method: 'POST', path: '/:id/update', description: 'Update session parameters' },
    { method: 'DELETE', path: '/:id', description: 'Stop and delete a session' },
  ],
});

export const browserTaskInfoRouter = createApiInfoRouter({
  name: 'Browser Task API', slug: 'browser-task', version: '2.0.0',
  description: 'Execute browser automation tasks, web scraping, structured extraction, and page capture for autonomous AI agents. Run tasks, workflows, extract structured data, and capture page content from any URL.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/run', description: 'Run a browser task by goal and task type. Supports search_and_extract, visit_and_summarize, extract_table.' },
    { method: 'POST', path: '/navigate', description: 'Navigate to a URL and execute a sequence of actions (click, scroll, wait). Returns page content and optional post-navigation extraction.' },
    { method: 'POST', path: '/extract', description: 'Fetch a URL and extract structured data using AI, with optional table extraction.' },
    { method: 'POST', path: '/extract/selectors', description: 'Deterministic CSS selector-based extraction from any URL. Faster and cheaper than AI extraction for known page structures.' },
    { method: 'POST', path: '/screenshot', description: 'Capture and summarize a web page by URL. Returns title, description, text preview, and optional AI summary.' },
    { method: 'POST', path: '/workflow/run', description: 'Execute a named browser workflow with structured input.' },
    { method: 'GET', path: '/tasks', description: 'List recent tasks with status, type, and latency.' },
    { method: 'GET', path: '/:task_id', description: 'Retrieve full result and trace for a specific task.' },
    { method: 'GET', path: '/workflows', description: 'List available named workflows with input schemas.' },
    { method: 'POST', path: '/session/start', description: 'Start a persistent browser session with optional cookies. Returns session_id for reuse across multiple actions.' },
    { method: 'POST', path: '/session/:session_id/run', description: 'Run actions inside an existing session. Supports wait_for selectors, post-action extraction, and persistent cookie state.' },
  ],
});

export const companyResearchInfoRouter = createApiInfoRouter({
  name: 'Agent Company Intelligence & Due Diligence API', slug: 'company-research', version: '2.0.0',
  description: 'Full-stack company intelligence engine for autonomous agents. Profile, score, risk-detect, find competitors, compare, monitor signals, summarize filings, and rank targets — designed for continuous due diligence loops with 5-8 calls per cycle.',
  category: 'ai-ml',
  loop_type: 'profile_score_risk_compete_monitor_rank',
  monetization_grade: 'A',
  primary_use_case: 'Agent due diligence and company intelligence loops',
  pricing: {
    '/profile-company': 0.003,
    '/score-company': 0.0025,
    '/detect-risks': 0.0035,
    '/find-competitors': 0.003,
    '/compare-companies': 0.004,
    '/monitor-signals': 0.002,
    '/summarize-filings': 0.0045,
    '/rank-targets': 0.005
  },
  endpoints: [
    { method: 'POST', path: '/profile-company', description: 'Full company profile: summary, industry, key people, products, tech stack, competitors, strengths, weaknesses.' },
    { method: 'POST', path: '/score-company', description: 'Score a company on growth, stability, innovation, market position, financial health. Returns grade and investment signal.' },
    { method: 'POST', path: '/detect-risks', description: 'Detect financial, legal, reputational, operational, market, and regulatory risks. Returns risk level and severity scores.' },
    { method: 'POST', path: '/find-competitors', description: 'Find top competitors with similarity scores, threat levels, and market overlap analysis.' },
    { method: 'POST', path: '/compare-companies', description: 'Compare 2-5 companies across criteria. Returns winner, per-company scores, and recommendations.' },
    { method: 'POST', path: '/monitor-signals', description: 'Detect recent signals: hiring, funding, partnerships, product launches, leadership changes. Returns alert level and next_check_ms.' },
    { method: 'POST', path: '/summarize-filings', description: 'Summarize 10-K, 10-Q, 8-K, S-1, or earnings filings with key metrics, highlights, and agent summary.' },
    { method: 'POST', path: '/rank-targets', description: 'Rank 2-10 companies by investment, acquisition, partnership, competitive threat, or hiring objective.' },
    { method: 'POST', path: '/research/company', description: 'Legacy: full company research report' },
  ],
});

export const cryptoNewsInfoRouter = createApiInfoRouter({
  name: 'Crypto News Impact API', slug: 'crypto-news-impact', version: '1.0.0',
  description: 'Analyze the market impact of crypto news articles using AI.',
  category: 'AI Research',
  endpoints: [
    { method: 'POST', path: '/', description: 'Analyze news impact on an asset' },
  ],
});

export const derivativesIntelligenceInfoRouter = createApiInfoRouter({
  name: 'Derivatives Intelligence API', slug: 'derivatives-intelligence', version: '1.0.0',
  description: 'AI-powered derivatives market intelligence and signal generation.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/intelligence/:asset', description: 'Get derivatives intelligence for asset' },
    { method: 'GET', path: '/intelligence/:asset/signal', description: 'AI signal from derivatives data' },
  ],
});

export const devUtilitiesInfoRouter = createApiInfoRouter({
  name: 'Dev Utilities API', slug: 'dev-utilities', version: '1.0.0',
  description: '25+ developer utility endpoints for validation, enrichment, text analysis and more.',
  category: 'Developer Tools',
  endpoints: [
    { method: 'POST', path: '/summarize', description: 'Summarize text with AI' },
    { method: 'POST', path: '/keywords', description: 'Extract keywords from text' },
    { method: 'POST', path: '/tone-analyze', description: 'Analyze tone of text' },
    { method: 'POST', path: '/email-extract', description: 'Extract emails from text' },
    { method: 'POST', path: '/address-validate', description: 'Validate a street address' },
    { method: 'POST', path: '/domain-intelligence', description: 'Domain intelligence lookup' },
    { method: 'POST', path: '/prompt-optimize', description: 'Optimize an AI prompt' },
    { method: 'POST', path: '/readability', description: 'Score text readability' },
    { method: 'POST', path: '/text-clean', description: 'Clean and normalize text' },
    { method: 'POST', path: '/cold-outreach', description: 'Generate cold outreach message' },
    { method: 'POST', path: '/company-enrichment', description: 'Enrich company data' },
    { method: 'POST', path: '/decision-explain', description: 'Explain a decision with AI' },
    { method: 'POST', path: '/follow-up-sequence', description: 'Generate follow-up sequence' },
    { method: 'POST', path: '/job-analyze', description: 'Analyze a job description' },
    { method: 'POST', path: '/password-strength', description: 'Check password strength' },
    { method: 'POST', path: '/pricing-intelligence', description: 'Pricing intelligence analysis' },
    { method: 'POST', path: '/task-cost', description: 'Estimate task cost' },
    { method: 'POST', path: '/who-to-contact', description: 'Find the right contact at a company' },
    { method: 'POST', path: '/url-metadata', description: 'Extract metadata from URL' },
    { method: 'POST', path: '/vat-validate', description: 'Validate a VAT number' },
    { method: 'POST', path: '/iban-validate', description: 'Validate an IBAN number' },
    { method: 'POST', path: '/card-validate', description: 'Validate a credit card number' },
    { method: 'POST', path: '/bic-validate', description: 'Validate a BIC/SWIFT code' },
    { method: 'POST', path: '/plan', description: 'Generate an execution plan' },
  ],
});

export const extractionInfoRouter = createApiInfoRouter({
  name: 'Extraction API', slug: 'extraction', version: '1.0.0',
  description: 'AI document extraction for invoices, contracts, resumes, receipts and leads.',
  category: 'AI Document Processing',
  endpoints: [
    { method: 'POST', path: '/extract/invoice', description: 'Extract data from an invoice' },
    { method: 'POST', path: '/extract/contract', description: 'Extract data from a contract' },
    { method: 'POST', path: '/extract/resume', description: 'Extract data from a resume' },
    { method: 'POST', path: '/extract/receipt', description: 'Extract data from a receipt' },
    { method: 'POST', path: '/extract/lead', description: 'Extract lead data from a document' },
    { method: 'POST', path: '/extract/custom', description: 'Custom extraction with schema' },
    { method: 'GET', path: '/schemas', description: 'List available extraction schemas' },
  ],
});

export const leadDiscoveryInfoRouter = createApiInfoRouter({
  name: 'Lead Discovery API', slug: 'lead-discovery', version: '1.0.0',
  description: 'AI-powered B2B lead discovery and prospecting.',
  category: 'Sales Intelligence',
  endpoints: [
    { method: 'POST', path: '/leads/find', description: 'Find leads matching criteria' },
  ],
});

export const marketIntelligenceInfoRouter = createApiInfoRouter({
  name: 'Market Intelligence API', slug: 'market-intelligence', version: '1.0.0',
  description: 'Comprehensive market intelligence and analysis for crypto assets.',
  category: 'Market Analytics',
  endpoints: [
    { method: 'GET', path: '/:ticker', description: 'Get market intelligence for a ticker' },
  ],
});

export const marketSignalInfoRouter = createApiInfoRouter({
  name: 'Market Signal API', slug: 'market-signal', version: '1.0.0',
  description: 'AI market signals combining technical and fundamental analysis.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/:ticker', description: 'Get market signal for a ticker' },
    { method: 'POST', path: '/batch', description: 'Get signals for multiple tickers' },
  ],
});

export const marketTriggerInfoRouter = createApiInfoRouter({
  name: 'Market Trigger API', slug: 'market-trigger', version: '1.0.0',
  description: 'Set and monitor market condition triggers for automated responses.',
  category: 'Crypto Monitoring',
  endpoints: [
    { method: 'POST', path: '/', description: 'Create a market trigger' },
  ],
});

export const marketWebhookInfoRouter = createApiInfoRouter({
  name: 'Market Webhook API', slug: 'market-webhook', version: '1.0.0',
  description: 'Webhook management for real-time market event notifications.',
  category: 'Crypto Monitoring',
  endpoints: [
    { method: 'POST', path: '/', description: 'Register a webhook' },
    { method: 'GET', path: '/:id', description: 'Get webhook details' },
    { method: 'GET', path: '/:id/logs', description: 'Get webhook delivery logs' },
  ],
});

export const onchainSignalInfoRouter = createApiInfoRouter({
  name: 'Onchain Signal API', slug: 'onchain-signal', version: '1.0.0',
  description: 'On-chain data signals including whale movements, smart money flows, and network activity.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/signals', description: 'Get current on-chain signals' },
    { method: 'GET', path: '/flows', description: 'Smart money flow data' },
    { method: 'GET', path: '/recent', description: 'Recent on-chain events' },
    { method: 'POST', path: '/analyze', description: 'Analyze an address on-chain activity' },
  ],
});

export const portfolioRebalanceInfoRouter = createApiInfoRouter({
  name: 'Portfolio Rebalance API', slug: 'portfolio-rebalance', version: '1.0.0',
  description: 'AI-powered portfolio rebalancing recommendations and execution planning.',
  category: 'AI Trading',
  endpoints: [
    { method: 'POST', path: '/rebalance', description: 'Get rebalancing recommendations' },
  ],
});

export const strategyExecutionInfoRouter = createApiInfoRouter({
  name: 'Strategy Execution API', slug: 'strategy-execution', version: '1.0.0',
  description: 'Execute and backtest trading strategies with AI optimization.',
  category: 'AI Trading',
  endpoints: [
    { method: 'GET', path: '/strategies', description: 'List available strategies' },
    { method: 'POST', path: '/execute', description: 'Execute a trading strategy' },
    { method: 'POST', path: '/backtest', description: 'Backtest a strategy' },
  ],
});

export const unifiedDecisionInfoRouter = createApiInfoRouter({
  name: 'Unified Decision API', slug: 'unified-decision', version: '1.0.0',
  description: 'AI-powered unified portfolio decision engine combining multiple signals.',
  category: 'AI Trading',
  endpoints: [
    { method: 'POST', path: '/', description: 'Get unified portfolio decision' },
  ],
});

export const websiteMonitorInfoRouter = createApiInfoRouter({
  name: 'Website Monitor API', slug: 'website-monitor', version: '1.0.0',
  description: 'Monitor websites for changes, uptime, and content updates.',
  category: 'Developer Tools',
  endpoints: [
    { method: 'POST', path: '/', description: 'Add a website to monitor' },
    { method: 'GET', path: '/:id', description: 'Get monitor status' },
    { method: 'GET', path: '/:id/history', description: 'Get monitor history' },
  ],
});

export const aiOutputSafetyInfoRouter = createApiInfoRouter({
  name: 'Agent Output Safety & Validation API', slug: 'ai-output-safety', version: '2.0.0',
  description: 'Validate, filter, and transform AI-generated outputs for safety, compliance, and correctness before external use. Returns structured risk levels, category flags, confidence scores, and suggested actions for agent decision-making.',
  category: 'AI Safety',
  endpoints: [
    { method: 'POST', path: '/check', description: 'Evaluate a single AI output for safety risks. Returns flags, categories, risk level, score, and suggested action.' },
    { method: 'POST', path: '/batch', description: 'Validate multiple AI outputs efficiently in a single request.' },
    { method: 'POST', path: '/redact', description: 'Remove or mask unsafe content from AI output. Returns cleaned output with redacted segments.' },
    { method: 'POST', path: '/score', description: 'Return a numeric safety score (0-1) with threshold comparison for agent decision-making.' },
  ],
});

export const documentIntelligenceInfoRouter = createApiInfoRouter({
  name: 'Document Intelligence API', slug: 'document-intelligence', version: '1.0.0',
  description: 'Extract structured data from PDFs, Word docs, and other documents using AI.',
  category: 'AI Document Processing',
  endpoints: [
    { method: 'POST', path: '/', description: 'Extract data from a document (base64)' },
    { method: 'POST', path: '/batch', description: 'Batch document extraction' },
    { method: 'GET', path: '/jobs/:jobId', description: 'Get async extraction job status' },
  ],
});

export const identityIntelligenceInfoRouter = createApiInfoRouter({
  name: 'Identity Intelligence API', slug: 'identity-intelligence', version: '1.0.0',
  description: 'Analyze and score identities for fraud risk, lead quality, and KYC.',
  category: 'Intelligence',
  endpoints: [
    { method: 'POST', path: '/', description: 'Analyze an identity' },
    { method: 'POST', path: '/batch', description: 'Batch identity analysis' },
  ],
});

export const imageToContentInfoRouter = createApiInfoRouter({
  name: 'Image to Content API', slug: 'image-to-content', version: '1.0.0',
  description: 'Convert images to structured content using AI vision — captions, tags, metadata.',
  category: 'AI Vision',
  endpoints: [
    { method: 'POST', path: '/', description: 'Analyze an image (base64)' },
    { method: 'POST', path: '/batch', description: 'Batch image analysis' },
  ],
});

export const leadEnrichmentInfoRouter = createApiInfoRouter({
  name: 'Lead Enrichment API', slug: 'lead-enrichment', version: '1.0.0',
  description: 'Enrich leads with company data, tech stack, buying signals, and AI outreach.',
  category: 'Sales Intelligence',
  endpoints: [
    { method: 'POST', path: '/', description: 'Enrich a lead by domain, email, or company name' },
    { method: 'POST', path: '/batch', description: 'Batch lead enrichment' },
  ],
});

export const leadQualityInfoRouter = createApiInfoRouter({
  name: 'Lead Quality API', slug: 'lead-quality', version: '1.0.0',
  description: 'Score and qualify leads using AI and enrichment signals.',
  category: 'Sales Intelligence',
  endpoints: [
    { method: 'POST', path: '/', description: 'Score a lead' },
    { method: 'POST', path: '/batch', description: 'Batch lead scoring' },
  ],
});

export const ipIntelligenceInfoRouter = createApiInfoRouter({
  name: 'IP Intelligence API', slug: 'ip-intelligence', version: '1.0.0',
  description: 'IP address lookup with geolocation, ISP, threat scoring, and VPN detection.',
  category: 'Intelligence',
  endpoints: [
    { method: 'GET', path: '/', description: 'Lookup an IP address', params: { ip: 'IP address to analyze' } },
  ],
});

export const emailValidationInfoRouter = createApiInfoRouter({
  name: 'Email Validation API', slug: 'email-validation', version: '1.0.0',
  description: 'Validate email addresses for deliverability, format, and domain reputation.',
  category: 'Developer Tools',
  endpoints: [
    { method: 'GET', path: '/', description: 'Validate an email address', params: { email: 'Email address to validate' } },
  ],
});

export const phoneValidationInfoRouter = createApiInfoRouter({
  name: 'Phone Validation API', slug: 'phone-validation', version: '1.0.0',
  description: 'Validate and format phone numbers with carrier and country detection.',
  category: 'Developer Tools',
  endpoints: [
    { method: 'GET', path: '/', description: 'Validate a phone number', params: { phone: 'Phone number', country: 'ISO country code' } },
  ],
});

export const searchExtractInfoRouter = createApiInfoRouter({
  name: 'Search Extract API', slug: 'search-extract', version: '1.0.0',
  description: 'AI-powered web search and content extraction for research and automation.',
  category: 'AI Research',
  endpoints: [
    { method: 'POST', path: '/', description: 'Search and extract web content' },
  ],
});

export const tokenTrustInfoRouter = createApiInfoRouter({
  name: 'Token Trust API', slug: 'token-trust', version: '1.0.0',
  description: 'Trust scoring for crypto tokens based on on-chain metrics and community signals.',
  category: 'DeFi Security',
  endpoints: [
    { method: 'GET', path: '/', description: 'Get trust score for a token', params: { contract: 'Token contract address', chain: 'Chain name' } },
  ],
});

export const trustInfoRouter = createApiInfoRouter({
  name: 'Trust API', slug: 'trust', version: '1.0.0',
  description: 'Universal trust scoring for wallets, contracts, and protocols.',
  category: 'DeFi Security',
  endpoints: [
    { method: 'POST', path: '/', description: 'Get trust score for any entity' },
  ],
});

export const userRiskInfoRouter = createApiInfoRouter({
  name: 'User Risk API', slug: 'user-risk', version: '1.0.0',
  description: 'Assess user risk profiles for DeFi platforms, exchanges, and Web3 apps.',
  category: 'DeFi Security',
  endpoints: [
    { method: 'POST', path: '/', description: 'Assess user risk profile' },
  ],
});

export const walletIntelligenceInfoRouter = createApiInfoRouter({
  name: 'Wallet Intelligence API', slug: 'wallet-intelligence', version: '1.0.0',
  description: 'Deep wallet intelligence including behavior analysis, scoring, and classification.',
  category: 'Wallet Analytics',
  endpoints: [
    { method: 'POST', path: '/', description: 'Analyze wallet intelligence' },
  ],
});

export const tokenPriceFeedInfoRouter = createApiInfoRouter({
  name: 'Token Price Feed API', slug: 'token-price-feed', version: '1.0.0',
  description: 'Real-time crypto token prices, multi-token lookups, chain leaderboards, and trending tokens via CoinGecko.',
  category: 'Crypto Data',
  endpoints: [
    { method: 'GET', path: '/price/:coinId', description: 'Get price and market data for a single token', params: { coinId: 'CoinGecko ID e.g. bitcoin, ethereum, solana' } },
    { method: 'GET', path: '/multi', description: 'Get prices for multiple tokens', params: { ids: 'Comma-separated CoinGecko IDs (max 25)' } },
    { method: 'GET', path: '/chain/:chain', description: 'Top tokens by market cap on a chain', params: { chain: 'ethereum | solana | base | polygon | arbitrum | avalanche | bsc', limit: 'Number of results (max 50)' } },
    { method: 'GET', path: '/trending', description: 'Currently trending tokens on CoinGecko' },
  ],
});

export const walletReputationInfoRouter = createApiInfoRouter({
  name: 'Wallet Reputation API', slug: 'wallet-reputation', version: '1.0.0',
  description: 'Score any Ethereum wallet based on age, transaction history, balance, and fail rate. Returns a 0-100 reputation score with flags.',
  category: 'Crypto Intelligence',
  endpoints: [
    { method: 'GET', path: '/score', description: 'Score a wallet address', params: { address: 'Ethereum wallet address (0x...)' } },
  ],
});

export const txSimulatorInfoRouter = createApiInfoRouter({
  name: 'TX Simulator API', slug: 'tx-simulator', version: '1.0.0',
  description: 'Simulate an Ethereum transaction before sending. Returns success prediction, gas cost, balance check, and nonce.',
  category: 'Crypto Infrastructure',
  endpoints: [
    { method: 'GET', path: '/simulate', description: 'Simulate a transaction', params: { from: 'Sender address', to: 'Recipient address', value: 'ETH amount (default 0)', gasLimit: 'Gas limit (default 21000)' } },
  ],
});

export const contractAnalyzerInfoRouter = createApiInfoRouter({
  name: 'Agent Smart Contract Risk & Due Diligence API', slug: 'contract-analyzer', version: '2.0.0',
  description: 'Full-stack smart contract intelligence engine for autonomous agents. Scan, score risk, detect vulnerabilities, classify, compare, monitor, summarize findings, and rank contracts — designed for DeFi agents, wallet agents, token launch agents, and security bots.',
  category: 'blockchain-web3',
  loop_type: 'scan_score_detect_classify_monitor_rank',
  monetization_grade: 'A',
  primary_use_case: 'Agent smart contract due diligence and security loops',
  pricing: {
    '/scan-contract': 0.004,
    '/score-risk': 0.0025,
    '/detect-vulnerabilities': 0.006,
    '/classify-contract': 0.002,
    '/compare-contracts': 0.0045,
    '/monitor-contract': 0.002,
    '/summarize-findings': 0.003,
    '/rank-contracts': 0.005
  },
  endpoints: [
    { method: 'POST', path: '/scan-contract', description: 'Full contract scan: risk level, flags, contract type, recommendations.' },
    { method: 'POST', path: '/score-risk', description: 'Risk score across reentrancy, access control, overflow, centralization, upgrade risk. Returns grade.' },
    { method: 'POST', path: '/detect-vulnerabilities', description: 'Detect exploitable vulnerabilities with severity, type, and location. Returns exploit risk rating.' },
    { method: 'POST', path: '/classify-contract', description: 'Classify contract type, standards, upgradeability, admin controls, mint/burn capabilities.' },
    { method: 'POST', path: '/compare-contracts', description: 'Compare 2-5 contracts by risk and trust score. Returns safest, riskiest, and per-contract recommendations.' },
    { method: 'POST', path: '/monitor-contract', description: 'Monitor for activity spikes, ownership changes, upgrades, pause events. Returns alert level and next_check_ms.' },
    { method: 'POST', path: '/summarize-findings', description: 'Agent-ready audit summary: executive summary, key findings, recommended actions, agent verdict.' },
    { method: 'POST', path: '/rank-contracts', description: 'Rank 2-10 contracts by safety, trust, activity, or defi_use objective.' },
    { method: 'POST', path: '/execution-gate', description: 'Cross-API safety gate: given contract + intended action, returns execute bool, risk score, blocking flags, and recommended_next_api/endpoint for chaining to Autopilot.' },
    { method: 'GET', path: '/analyze', description: 'Legacy: full contract analysis by address' },
  ],
});

export const onchainNewsInfoRouter = createApiInfoRouter({
  name: 'Onchain News API', slug: 'onchain-news', version: '1.0.0',
  description: 'Real-time crypto news and AI sentiment analysis for any token. Returns articles, sentiment score, key themes, and market impact.',
  category: 'Crypto Intelligence',
  endpoints: [
    { method: 'GET', path: '/news', description: 'Get news and sentiment for a token', params: { token: 'Token name or symbol e.g. bitcoin, ETH, solana' } },
  ],
});

export const ensResolverInfoRouter = createApiInfoRouter({
  name: 'ENS Resolver API', slug: 'ens-resolver', version: '1.0.0',
  description: 'Resolve ENS names to Ethereum addresses and reverse lookup addresses to ENS names. Returns avatar, display name, and social records.',
  category: 'Crypto Infrastructure',
  endpoints: [
    { method: 'GET', path: '/resolve', description: 'Resolve ENS name to address and profile', params: { ens: 'ENS name e.g. vitalik.eth' } },
    { method: 'GET', path: '/lookup', description: 'Reverse lookup address to ENS name', params: { address: 'Ethereum address (0x...)' } },
  ],
});

export const webResearcherInfoRouter = createApiInfoRouter({
  name: 'Web Researcher API', slug: 'web-researcher', version: '1.0.0',
  description: 'Give an AI agent a query and get back structured research with key findings, summary, conclusion, and sources. Powered by Tavily and Claude.',
  category: 'AI Agents',
  endpoints: [
    { method: 'GET', path: '/research', description: 'Research any query and return structured findings', params: { query: 'Research query', depth: 'basic | deep (default: basic)' } },
  ],
});

export const textExtractorInfoRouter = createApiInfoRouter({
  name: 'Text Extractor API', slug: 'text-extractor', version: '1.0.0',
  description: 'Extract structured data and named entities from any text using Claude AI. Supports custom schema extraction and automatic entity detection.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/extract', description: 'Extract structured data from text using a custom schema', params: { text: 'Input text', schema: 'What to extract e.g. name, email, phone' } },
    { method: 'POST', path: '/entities', description: 'Extract named entities from text', params: { text: 'Input text' } },
  ],
});

export const decisionScorerInfoRouter = createApiInfoRouter({
  name: 'Decision Scorer API', slug: 'decision-scorer', version: '1.0.0',
  description: 'AI-powered decision and risk scoring. Returns a 0-100 score, pros, cons, risks, and recommendation for any decision.',
  category: 'AI Agents',
  endpoints: [
    { method: 'POST', path: '/score', description: 'Score a decision and return risk assessment', params: { decision: 'The decision to evaluate', context: 'Optional context', goal: 'Optional goal' } },
  ],
});
