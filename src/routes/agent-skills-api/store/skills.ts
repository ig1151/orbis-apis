import { AgentSkill } from '../types';

const skills: Map<string, AgentSkill> = new Map();
const invocationLog: Array<{ skillId: string; timestamp: number }> = [];

// Pre-seed with OrbisAPI skills
const SEED_SKILLS: AgentSkill[] = [
  {
    skillId: 'skill_onchain_wallet_analyze',
    name: 'Wallet Analyzer',
    description: 'Analyze any EVM wallet for accumulation/distribution signals, ETH balance, and transaction patterns',
    category: 'crypto-intelligence',
    capabilities: ['wallet-analysis', 'onchain-signals', 'accumulation-detection'],
    endpoint: 'https://onchain-signal-api.onrender.com/v1/wallet/analyze',
    method: 'GET',
    inputs: [{ name: 'address', type: 'string', required: true, description: 'EVM wallet address (0x...)' }, { name: 'chain', type: 'string', required: false, description: 'Chain name (ethereum, base, arbitrum)' }],
    outputs: [{ name: 'signal', type: 'string', description: 'ACCUMULATING|DISTRIBUTING|NEUTRAL|INACTIVE' }, { name: 'signalScore', type: 'number', description: '-100 to +100' }],
    pricingType: 'per_call',
    pricePerCall: 0.008,
    framework: null,
    ownerAgentId: null,
    tags: ['wallet', 'onchain', 'ethereum', 'signals'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_defi_risk_token',
    name: 'Token Safety Scanner',
    description: 'Detect honeypots, mintable tokens, hidden owners, and rug pull risks for any EVM token',
    category: 'defi-security',
    capabilities: ['honeypot-detection', 'token-safety', 'rug-pull-detection'],
    endpoint: 'https://defi-risk-api.onrender.com/v1/token/safety',
    method: 'GET',
    inputs: [{ name: 'contract', type: 'string', required: true, description: 'Token contract address' }, { name: 'chain', type: 'string', required: false, description: 'Chain (ethereum, bsc, base, solana)' }],
    outputs: [{ name: 'isHoneypot', type: 'boolean', description: 'True if token is a honeypot' }, { name: 'riskScore', type: 'number', description: '0-100 risk score' }, { name: 'riskLevel', type: 'string', description: 'LOW|MEDIUM|HIGH|CRITICAL' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['security', 'token', 'honeypot', 'defi'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_funding_rate_signal',
    name: 'Funding Rate Signal',
    description: 'Get AI-interpreted funding rate sentiment signal for a crypto symbol across 25+ exchanges',
    category: 'trading-signals',
    capabilities: ['funding-rates', 'sentiment-analysis', 'arbitrage-detection'],
    endpoint: 'https://funding-rate-api.onrender.com/v1/rates/signal',
    method: 'GET',
    inputs: [{ name: 'symbol', type: 'string', required: true, description: 'Crypto symbol (BTC, ETH, SOL)' }],
    outputs: [{ name: 'signal', type: 'string', description: 'STRONG_BUY|BUY|NEUTRAL|SELL|STRONG_SELL' }, { name: 'fundingRate', type: 'number', description: 'Average funding rate %' }, { name: 'sentiment', type: 'string', description: 'Market sentiment' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['trading', 'funding-rates', 'signals', 'derivatives'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_strategy_decision',
    name: 'Strategy Decision Engine',
    description: 'Get unified BUY/SELL/HOLD decision combining funding rates, prediction markets, and price momentum',
    category: 'trading-signals',
    capabilities: ['strategy-signals', 'multi-signal-synthesis', 'trading-decisions'],
    endpoint: 'https://strategy-signal-api.onrender.com/v1/strategy',
    method: 'GET',
    inputs: [{ name: 'symbol', type: 'string', required: true, description: 'Crypto symbol (BTC, ETH, SOL, etc.)' }],
    outputs: [{ name: 'decision', type: 'string', description: 'STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL' }, { name: 'confidence', type: 'number', description: '0-1 confidence score' }, { name: 'riskLevel', type: 'string', description: 'low|medium|high' }],
    pricingType: 'per_call',
    pricePerCall: 0.15,
    framework: null,
    ownerAgentId: null,
    tags: ['strategy', 'trading', 'decision', 'pipeline'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_prediction_market_signal',
    name: 'Prediction Market Signal',
    description: 'Get AI-interpreted signal from Polymarket prediction markets with probability, trend, and trading implication',
    category: 'market-intelligence',
    capabilities: ['prediction-markets', 'event-probabilities', 'market-signals'],
    endpoint: 'https://prediction-market-api-g0xb.onrender.com/v1/markets/signal',
    method: 'GET',
    inputs: [{ name: 'q', type: 'string', required: true, description: 'Market search query (e.g. "bitcoin price", "fed rate")' }],
    outputs: [{ name: 'probability', type: 'number', description: '0-1 implied probability' }, { name: 'actionBias', type: 'string', description: 'bullish|bearish|neutral' }, { name: 'trend', type: 'string', description: 'increasing|decreasing|stable' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['prediction-markets', 'polymarket', 'signals', 'events'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_narrative_trending',
    name: 'Crypto Narrative Scanner',
    description: 'Identify trending crypto narratives with momentum scores — AI tokens, RWA, DePIN, Layer 2, and more',
    category: 'market-intelligence',
    capabilities: ['narrative-detection', 'trend-analysis', 'sector-momentum'],
    endpoint: 'https://crypto-narrative-api.onrender.com/v1/narratives/trending',
    method: 'GET',
    inputs: [{ name: 'limit', type: 'number', required: false, description: 'Number of narratives to return (default 8)' }],
    outputs: [{ name: 'narratives', type: 'array', description: 'List of trending narratives with momentum scores' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['narratives', 'trends', 'crypto', 'market-intelligence'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_stablecoin_yield',
    name: 'Stablecoin Yield Optimizer',
    description: 'Get AI-recommended best yield for USDC/USDT across 500+ DeFi protocols with risk-adjusted allocation',
    category: 'defi-yield',
    capabilities: ['yield-optimization', 'risk-adjusted-returns', 'protocol-comparison'],
    endpoint: 'https://stablecoin-yield-api.onrender.com/v1/best-yield',
    method: 'GET',
    inputs: [{ name: 'token', type: 'string', required: false, description: 'Token (USDC, USDT, DAI)' }, { name: 'riskTolerance', type: 'string', required: false, description: 'low|medium|high' }],
    outputs: [{ name: 'riskAdjustedBest', type: 'object', description: 'Best yield pool for risk tolerance' }, { name: 'aiRecommendation', type: 'string', description: 'AI yield strategy recommendation' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['yield', 'stablecoin', 'defi', 'aave', 'morpho'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
  {
    skillId: 'skill_wallet_portfolio',
    name: 'Wallet Portfolio Analyzer',
    description: 'Get full wallet portfolio snapshot with allocation, risk score, overexposed assets, and suggested action',
    category: 'portfolio-management',
    capabilities: ['portfolio-analysis', 'risk-scoring', 'asset-allocation'],
    endpoint: 'https://wallet-portfolio-api.onrender.com/v1/wallet/snapshot',
    method: 'GET',
    inputs: [{ name: 'address', type: 'string', required: true, description: 'EVM wallet address' }, { name: 'chain', type: 'string', required: false, description: 'Chain name' }],
    outputs: [{ name: 'totalPortfolioUsd', type: 'number', description: 'Total portfolio value' }, { name: 'riskScore', type: 'number', description: '0-100 risk score' }, { name: 'suggestedAction', type: 'string', description: 'rebalance|diversify|hold|reduce-risk' }],
    pricingType: 'per_call',
    pricePerCall: 0.05,
    framework: null,
    ownerAgentId: null,
    tags: ['portfolio', 'wallet', 'risk', 'allocation'],
    invocationCount: 0,
    lastInvokedAt: null,
    registeredAt: new Date().toISOString(),
    version: '1.0.0',
    isActive: true,
  },
];

// Seed the store
for (const skill of SEED_SKILLS) {
  skills.set(skill.skillId, skill);
}

export function saveSkill(skill: AgentSkill): void {
  skills.set(skill.skillId, skill);
}

export function getSkill(skillId: string): AgentSkill | null {
  return skills.get(skillId) || null;
}

export function getAllSkills(): AgentSkill[] {
  return Array.from(skills.values()).filter(s => s.isActive);
}

export function searchSkills(query: string, category?: string, tags?: string[]): AgentSkill[] {
  const queryLower = query.toLowerCase();
  return getAllSkills().filter(skill => {
    if (category && skill.category.toLowerCase() !== category.toLowerCase()) return false;
    if (tags && tags.length > 0 && !tags.some(t => skill.tags.includes(t.toLowerCase()))) return false;
    return (
      skill.name.toLowerCase().includes(queryLower) ||
      skill.description.toLowerCase().includes(queryLower) ||
      skill.capabilities.some(c => c.toLowerCase().includes(queryLower)) ||
      skill.tags.some(t => t.toLowerCase().includes(queryLower)) ||
      skill.category.toLowerCase().includes(queryLower)
    );
  });
}

export function getTrendingSkills(limit = 10): AgentSkill[] {
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  const recent = invocationLog.filter(l => l.timestamp > last24h);
  const counts = new Map<string, number>();
  for (const log of recent) {
    counts.set(log.skillId, (counts.get(log.skillId) || 0) + 1);
  }
  return getAllSkills()
    .sort((a, b) => (counts.get(b.skillId) || 0) - (counts.get(a.skillId) || 0))
    .slice(0, limit);
}

export function recordInvocation(skillId: string): void {
  invocationLog.push({ skillId, timestamp: Date.now() });
  const skill = skills.get(skillId);
  if (skill) {
    skill.invocationCount++;
    skill.lastInvokedAt = new Date().toISOString();
  }
  // Keep log trimmed
  if (invocationLog.length > 10000) invocationLog.splice(0, 1000);
}

export function skillCount(): number {
  return skills.size;
}

export function getCategories(): string[] {
  return [...new Set(getAllSkills().map(s => s.category))];
}
