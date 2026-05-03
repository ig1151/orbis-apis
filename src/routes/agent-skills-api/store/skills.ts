import { AgentSkill } from '../types';

const skills: Map<string, AgentSkill> = new Map();
const invocationLog: Array<{ skillId: string; timestamp: number }> = [];

// Pre-seed with OrbisAPI skills
const SEED_SKILLS: AgentSkill[] = [
  {
    skillId: "skill_onchain_wallet_analyze",
    name: "Wallet Analyzer",
    description: "Analyze any EVM wallet for accumulation/distribution signals, ETH balance, and transaction patterns",
    category: "crypto-intelligence",
    capabilities: ["wallet-analysis", "onchain-signals", "accumulation-detection"],
    endpoint: "https://onchain-signal-api.onrender.com/v1/wallet/analyze",
    method: "GET",
    inputs: [{ name: "address", type: "string", required: true, description: "EVM wallet address (0x...)" }, { name: "chain", type: "string", required: false, description: "Chain name (ethereum, base, arbitrum)" }],
    outputs: [{ name: "signal", type: "string", description: "ACCUMULATING|DISTRIBUTING|NEUTRAL|INACTIVE" }, { name: "signalScore", type: "number", description: "-100 to +100" }],
    pricingType: "per_call", pricePerCall: 0.008, framework: null, ownerAgentId: null,
    tags: ["wallet", "onchain", "ethereum", "signals"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_defi_risk_token",
    name: "Token Safety Scanner",
    description: "Detect honeypots, mintable tokens, hidden owners, and rug pull risks for any EVM token",
    category: "defi-security",
    capabilities: ["honeypot-detection", "token-safety", "rug-pull-detection"],
    endpoint: "https://defi-risk-api.onrender.com/v1/token/safety",
    method: "GET",
    inputs: [{ name: "contract", type: "string", required: true, description: "Token contract address" }, { name: "chain", type: "string", required: false, description: "Chain (ethereum, bsc, base, solana)" }],
    outputs: [{ name: "isHoneypot", type: "boolean", description: "True if token is a honeypot" }, { name: "riskScore", type: "number", description: "0-100 risk score" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["security", "token", "honeypot", "defi"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_funding_rate_signal",
    name: "Funding Rate Signal",
    description: "Get AI-interpreted funding rate sentiment signal for a crypto symbol across 25+ exchanges",
    category: "trading-signals",
    capabilities: ["funding-rates", "sentiment-analysis", "arbitrage-detection"],
    endpoint: "https://funding-rate-api.onrender.com/v1/rates/signal",
    method: "GET",
    inputs: [{ name: "symbol", type: "string", required: true, description: "Crypto symbol (BTC, ETH, SOL)" }],
    outputs: [{ name: "signal", type: "string", description: "STRONG_BUY|BUY|NEUTRAL|SELL|STRONG_SELL" }, { name: "fundingRate", type: "number", description: "Average funding rate %" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["trading", "funding-rates", "signals", "derivatives"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_strategy_decision",
    name: "Strategy Decision Engine",
    description: "Get unified BUY/SELL/HOLD decision combining funding rates, prediction markets, and price momentum",
    category: "trading-signals",
    capabilities: ["strategy-signals", "multi-signal-synthesis", "trading-decisions"],
    endpoint: "https://strategy-signal-api.onrender.com/v1/strategy",
    method: "GET",
    inputs: [{ name: "symbol", type: "string", required: true, description: "Crypto symbol (BTC, ETH, SOL, etc.)" }],
    outputs: [{ name: "decision", type: "string", description: "STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL" }, { name: "confidence", type: "number", description: "0-1 confidence score" }],
    pricingType: "per_call", pricePerCall: 0.15, framework: null, ownerAgentId: null,
    tags: ["strategy", "trading", "decision", "pipeline"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_prediction_market_signal",
    name: "Prediction Market Signal",
    description: "Get AI-interpreted signal from Polymarket prediction markets with probability, trend, and trading implication",
    category: "market-intelligence",
    capabilities: ["prediction-markets", "event-probabilities", "market-signals"],
    endpoint: "https://prediction-market-api-g0xb.onrender.com/v1/markets/signal",
    method: "GET",
    inputs: [{ name: "q", type: "string", required: true, description: "Market search query" }],
    outputs: [{ name: "probability", type: "number", description: "0-1 implied probability" }, { name: "actionBias", type: "string", description: "bullish|bearish|neutral" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["prediction-markets", "polymarket", "signals", "events"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_narrative_trending",
    name: "Crypto Narrative Scanner",
    description: "Identify trending crypto narratives with momentum scores — AI tokens, RWA, DePIN, Layer 2, and more",
    category: "market-intelligence",
    capabilities: ["narrative-detection", "trend-analysis", "sector-momentum"],
    endpoint: "https://crypto-narrative-api.onrender.com/v1/narratives/trending",
    method: "GET",
    inputs: [{ name: "limit", type: "number", required: false, description: "Number of narratives to return" }],
    outputs: [{ name: "narratives", type: "array", description: "List of trending narratives with momentum scores" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["narratives", "trends", "crypto", "market-intelligence"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_stablecoin_yield",
    name: "Stablecoin Yield Optimizer",
    description: "Get AI-recommended best yield for USDC/USDT across 500+ DeFi protocols with risk-adjusted allocation",
    category: "defi-yield",
    capabilities: ["yield-optimization", "risk-adjusted-returns", "protocol-comparison"],
    endpoint: "https://stablecoin-yield-api.onrender.com/v1/best-yield",
    method: "GET",
    inputs: [{ name: "token", type: "string", required: false, description: "Token (USDC, USDT, DAI)" }, { name: "riskTolerance", type: "string", required: false, description: "low|medium|high" }],
    outputs: [{ name: "riskAdjustedBest", type: "object", description: "Best yield pool" }, { name: "aiRecommendation", type: "string", description: "AI yield strategy" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["yield", "stablecoin", "defi", "aave", "morpho"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_wallet_portfolio",
    name: "Wallet Portfolio Analyzer",
    description: "Get full wallet portfolio snapshot with allocation, risk score, overexposed assets, and suggested action",
    category: "portfolio-management",
    capabilities: ["portfolio-analysis", "risk-scoring", "asset-allocation"],
    endpoint: "https://wallet-portfolio-api.onrender.com/v1/wallet/snapshot",
    method: "GET",
    inputs: [{ name: "address", type: "string", required: true, description: "EVM wallet address" }],
    outputs: [{ name: "totalPortfolioUsd", type: "number", description: "Total portfolio value" }, { name: "suggestedAction", type: "string", description: "rebalance|diversify|hold|reduce-risk" }],
    pricingType: "per_call", pricePerCall: 0.05, framework: null, ownerAgentId: null,
    tags: ["portfolio", "wallet", "risk", "allocation"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_company_research",
    name: "Company Research",
    description: "Research any company and return structured data including overview, products, competitors, funding, and key signals",
    category: "research",
    capabilities: ["company-research", "competitive-intelligence", "business-analysis"],
    endpoint: "https://orbis-apis.onrender.com/agent-workflow/run",
    method: "POST",
    inputs: [{ name: "company", type: "string", required: true, description: "Company name or domain" }],
    outputs: [{ name: "overview", type: "string", description: "Company summary" }, { name: "competitors", type: "array", description: "Competitors list" }],
    pricingType: "per_call", pricePerCall: 0.007, framework: null, ownerAgentId: null,
    tags: ["research", "company", "business", "intelligence"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_lead_enrichment",
    name: "Lead Enrichment",
    description: "Enrich a lead with company data, social profiles, job title, and contact signals",
    category: "sales-intelligence",
    capabilities: ["lead-enrichment", "contact-discovery", "prospect-research"],
    endpoint: "https://orbis-apis.onrender.com/lead-enrichment/enrich",
    method: "POST",
    inputs: [{ name: "email", type: "string", required: false, description: "Lead email" }, { name: "company", type: "string", required: false, description: "Company name" }],
    outputs: [{ name: "enrichedLead", type: "object", description: "Full enriched lead profile" }, { name: "confidence", type: "number", description: "Enrichment confidence score" }],
    pricingType: "per_call", pricePerCall: 0.005, framework: null, ownerAgentId: null,
    tags: ["leads", "enrichment", "sales", "crm"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_web_research",
    name: "Web Researcher",
    description: "Search the web and extract structured insights from multiple sources for any query or topic",
    category: "research",
    capabilities: ["web-search", "content-extraction", "research-synthesis"],
    endpoint: "https://orbis-apis.onrender.com/web-researcher/research",
    method: "GET",
    inputs: [{ name: "query", type: "string", required: true, description: "Research query or topic" }],
    outputs: [{ name: "summary", type: "string", description: "Synthesized research summary" }, { name: "sources", type: "array", description: "Source URLs" }],
    pricingType: "per_call", pricePerCall: 0.005, framework: null, ownerAgentId: null,
    tags: ["research", "web", "search", "extraction"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_text_extraction",
    name: "Text Extractor",
    description: "Extract structured data, entities, and key information from unstructured text or documents",
    category: "data-processing",
    capabilities: ["text-extraction", "entity-recognition", "structured-output"],
    endpoint: "https://orbis-apis.onrender.com/text-extractor/extract",
    method: "POST",
    inputs: [{ name: "text", type: "string", required: true, description: "Raw text to extract from" }],
    outputs: [{ name: "extracted", type: "object", description: "Extracted structured data" }, { name: "entities", type: "array", description: "Named entities" }],
    pricingType: "per_call", pricePerCall: 0.003, framework: null, ownerAgentId: null,
    tags: ["extraction", "nlp", "text", "entities"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_action_execute",
    name: "Agent Action Executor",
    description: "Execute a discrete agent action such as send email, post message, create task, or trigger webhook",
    category: "agent-actions",
    capabilities: ["action-execution", "task-automation", "webhook-trigger"],
    endpoint: "https://orbis-apis.onrender.com/action/execute",
    method: "POST",
    inputs: [{ name: "action", type: "string", required: true, description: "Action type to execute" }, { name: "payload", type: "object", required: true, description: "Action payload" }],
    outputs: [{ name: "result", type: "object", description: "Action result" }, { name: "status", type: "string", description: "completed|failed|pending" }],
    pricingType: "per_call", pricePerCall: 0.004, framework: null, ownerAgentId: null,
    tags: ["actions", "automation", "email", "tasks"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
  },
  {
    skillId: "skill_decision_scorer",
    name: "Decision Scorer",
    description: "Score and rank a set of options or candidates based on weighted criteria and return a structured decision",
    category: "decision-making",
    capabilities: ["decision-scoring", "option-ranking", "criteria-weighting"],
    endpoint: "https://orbis-apis.onrender.com/decision-scorer/score",
    method: "POST",
    inputs: [{ name: "options", type: "array", required: true, description: "Options to score" }, { name: "criteria", type: "array", required: true, description: "Scoring criteria" }],
    outputs: [{ name: "ranked", type: "array", description: "Ranked options with scores" }, { name: "winner", type: "object", description: "Top-ranked option" }],
    pricingType: "per_call", pricePerCall: 0.004, framework: null, ownerAgentId: null,
    tags: ["decisions", "scoring", "ranking", "ai"],
    invocationCount: 0, lastInvokedAt: null, registeredAt: new Date().toISOString(), version: "1.0.0", isActive: true,
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
