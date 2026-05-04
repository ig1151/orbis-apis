import { actionRouter, actionTaskTypesRouter } from './routes/action';
import { nftMetadataInfoRouter, nftTokenRouter, nftCollectionRouter, nftWalletRouter, nftTransfersRouter } from './routes/nft-metadata';
import { gasOptimizerInfoRouter, fundingRateInfoRouter, strategySignalInfoRouter, predictionMarketInfoRouter, tokenScreenerInfoRouter, tokenUnlockInfoRouter, agentIdentityInfoRouter, cryptoNarrativeInfoRouter, defiRiskInfoRouter, cryptoAlertsInfoRouter, agentSkillsInfoRouter, defiPositionInfoRouter, walletPortfolioInfoRouter, crossChainInfoRouter, derivativesInfoRouter, marketCorrelationInfoRouter, yieldFarmingInfoRouter, tokenomicsInfoRouter, liquidationFeedInfoRouter, marketStressInfoRouter, walletInfoRouter, stablecoinYieldInfoRouter, metaStrategyInfoRouter, socialSentimentInfoRouter, alphaSignalInfoRouter, actionInfoRouter, agentMemoryInfoRouter, agentWorkflowInfoRouter, autopilotInfoRouter, browserTaskInfoRouter, companyResearchInfoRouter, cryptoNewsInfoRouter, derivativesIntelligenceInfoRouter, devUtilitiesInfoRouter, extractionInfoRouter, leadDiscoveryInfoRouter, marketIntelligenceInfoRouter, marketSignalInfoRouter, marketTriggerInfoRouter, marketWebhookInfoRouter, onchainSignalInfoRouter, portfolioRebalanceInfoRouter, strategyExecutionInfoRouter, unifiedDecisionInfoRouter, websiteMonitorInfoRouter, aiOutputSafetyInfoRouter, documentIntelligenceInfoRouter, identityIntelligenceInfoRouter, imageToContentInfoRouter, leadEnrichmentInfoRouter, leadQualityInfoRouter, ipIntelligenceInfoRouter, emailValidationInfoRouter, phoneValidationInfoRouter, searchExtractInfoRouter, tokenTrustInfoRouter, trustInfoRouter, userRiskInfoRouter, walletIntelligenceInfoRouter, tokenPriceFeedInfoRouter, walletReputationInfoRouter, txSimulatorInfoRouter, contractAnalyzerInfoRouter, onchainNewsInfoRouter, ensResolverInfoRouter, webResearcherInfoRouter, textExtractorInfoRouter, decisionScorerInfoRouter } from "./middleware/allApiInfo";
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'orbis-apis', timestamp: new Date().toISOString() });
});

// ── Wallet Balance ────────────────────────────────────────────────────────────
import walletBalanceRouter from './routes/wallet/index';
app.use('/wallet', walletBalanceRouter);

// ── Alpha Signal ──────────────────────────────────────────────────────────────
import alphaSignalRouter from './routes/alpha-signal/index';
app.use('/alpha-signal', alphaSignalInfoRouter);
app.get('/alpha-signal/info', (_req, res) => {
  res.json({
    name: 'Agent Trading Signal & Opportunity Detection API',
    version: '2.0.0',
    description: 'Real-time alpha signal engine for autonomous agents. Structured machine-readable outputs built for continuous polling loops, decision engines, and execution pipelines. Designed for 6+ calls per agent cycle: scan → filter → score → explain → detect → rank → act.',
    category: 'Agent Trading Infrastructure',
    loop_type: 'scan_filter_score_rank_execute',
    monetization_grade: 'A',
    primary_use_case: 'High-frequency autonomous trading signal loops',
    baseUrl: 'https://orbis-apis.onrender.com/alpha-signal',
    website: 'https://orbis-apis.onrender.com',
    docs: 'https://orbis-apis.onrender.com/alpha-signal/docs',
    openapi: 'https://orbis-apis.onrender.com/alpha-signal/openapi.json',
    pricing: {
      'scan-signals': 0.002,
      'filter-signals': 0.0008,
      'score-asset': 0.0015,
      'explain': 0.0025,
      'detect-event': 0.002,
      'rank-opportunities': 0.0035
    },
    endpoints: [
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/scan-signals', description: 'Core polling loop — scan up to 10 assets for live signals. Call every 1-5 minutes. Alias: /scan' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/filter-signals', description: 'Filter signal array by confidence, type, action, urgency, trend.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/score-asset', description: 'Composite score: trend, momentum, volume, sentiment, regime, bias. Alias: /score' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/explain', description: 'Deep signal explanation: drivers, confidence breakdown, risk factors, recommendation.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/detect-event', description: 'Detect market events: volume spikes, breakouts, whale moves. Alias: /trigger-event' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/alpha-signal/rank-opportunities', description: 'Rank assets by opportunity score across universes. Alias: /rank' },
    ]
  });
});
app.use('/alpha-signal', alphaSignalRouter);

// ── Action API ────────────────────────────────────────────────────────────────

// ── Agent Memory ──────────────────────────────────────────────────────────────
import memoryRouter from './routes/agent-memory-api/routes/memory';
import sessionsRouter from './routes/agent-memory-api/routes/sessions';
import memoryCompressRouter from './routes/agent-memory-api/routes/compress';
import memoryExtractRouter from './routes/agent-memory-api/routes/extract';
app.use('/agent-memory', agentMemoryInfoRouter);
app.use('/agent-memory', memoryCompressRouter);
app.use('/agent-memory', memoryExtractRouter);
app.use('/agent-memory', memoryRouter);
app.use('/agent-memory', sessionsRouter);

// ── Agent Workflow ────────────────────────────────────────────────────────────
import workflowRouter from './routes/agent-workflow-api/routes/workflow';

// ── AI Output Safety ──────────────────────────────────────────────────────────
import { safetyRouter } from './routes/ai-output-safety-api/routes/safety.route';
app.use('/ai-output-safety', aiOutputSafetyInfoRouter);
app.use('/ai-output-safety', safetyRouter);

// ── Autopilot ─────────────────────────────────────────────────────────────────
import autopilotRouter from './routes/autopilot-api/routes/autopilot';
app.use('/autopilot', autopilotInfoRouter);
app.get('/autopilot/info', (_req, res) => {
  res.json({
    name: 'Agent Execution Orchestration Engine',
    version: '2.0.0',
    description: 'Central agent brain API — the glue layer between all Orbis APIs. Determines next actions, makes decisions between options, gates execution with risk checks, decomposes goals into plans, and recovers from failures. Designed to be called every loop iteration.',
    category: 'AI Agents',
    loop_type: 'detect_decide_gate_execute_recover',
    monetization_grade: 'A',
    primary_use_case: 'Agent decision orchestration across all APIs',
    baseUrl: 'https://orbis-apis.onrender.com/autopilot',
    website: 'https://orbis-apis.onrender.com',
    docs: 'https://orbis-apis.onrender.com/autopilot/docs',
    openapi: 'https://orbis-apis.onrender.com/autopilot/openapi.json',
    pricing: {
      '/next-action': 0.002,
      '/decide': 0.002,
      '/should-execute': 0.0015,
      '/plan': 0.003,
      '/retry-strategy': 0.0015
    },
    endpoints: [
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/next-action', description: 'Core loop driver — returns best next action with confidence, urgency, chain_to hints.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/decide', description: 'Decide between multiple options. Returns selected, confidence, risk score, rejected.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/should-execute', description: 'Risk gate — execute bool, risk score, blocking factors, retry hints.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/plan', description: 'Decompose goal into ordered steps with API routing and timing estimates.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/retry-strategy', description: 'Failure recovery — strategy, delay, max attempts, alternative action.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/autopilot/should-act', description: 'Ultra-lightweight gating check — pure logic, 0ms AI latency, $0.001. Call every step.' },
    ]
  });
});
app.use('/autopilot', autopilotRouter);

// ── Browser Task ──────────────────────────────────────────────────────────────
import taskRouter from './routes/browser-task-api/routes/task';
app.use('/browser-task', browserTaskInfoRouter);
app.use('/browser-task', taskRouter);

// ── Company Research ──────────────────────────────────────────────────────────
import researchRouter from './routes/company-research-api/routes/research';
app.use('/company-research', companyResearchInfoRouter);
app.get('/company-research/info', (_req, res) => {
  res.json({
    name: 'Agent Company Intelligence & Due Diligence API',
    version: '2.0.0',
    description: 'Full-stack company intelligence engine for autonomous agents. Profile, score, risk-detect, find competitors, compare, monitor signals, summarize filings, and rank targets — designed for continuous due diligence loops with 5-8 calls per cycle.',
    category: 'ai-ml',
    loop_type: 'profile_score_risk_compete_monitor_rank',
    monetization_grade: 'A',
    primary_use_case: 'Agent due diligence and company intelligence loops',
    baseUrl: 'https://orbis-apis.onrender.com/company-research',
    website: 'https://orbis-apis.onrender.com',
    docs: 'https://orbis-apis.onrender.com/company-research/docs',
    openapi: 'https://orbis-apis.onrender.com/company-research/openapi.json',
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
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/profile-company', description: 'Full company profile: summary, industry, key people, products, tech stack, competitors.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/score-company', description: 'Score on growth, stability, innovation, market position. Returns grade and investment signal.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/detect-risks', description: 'Detect financial, legal, reputational, operational risks with severity scores.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/find-competitors', description: 'Find competitors with similarity scores, threat levels, market overlap.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/compare-companies', description: 'Compare 2-5 companies across criteria. Returns winner and per-company scores.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/monitor-signals', description: 'Detect hiring, funding, partnership, product, leadership signals. Returns alert level.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/summarize-filings', description: 'Summarize 10-K, 10-Q, 8-K, S-1, earnings with key metrics and agent summary.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/company-research/rank-targets', description: 'Rank companies by investment, acquisition, partnership, or competitive threat objective.' },
    ]
  });
});
app.use('/company-research', researchRouter);

// ── Crypto News Impact ────────────────────────────────────────────────────────
import newsImpactRouter from './routes/crypto-news-impact-api/routes/newsImpact';
app.use('/crypto-news-impact', newsImpactRouter);

// ── Dev Utilities ─────────────────────────────────────────────────────────────
import urlMetadataRouter from './routes/dev-utilities-api/routes/urlMetadata';
import emailExtractorRouter from './routes/dev-utilities-api/routes/emailExtractor';
import domainIntelligenceRouter from './routes/dev-utilities-api/routes/domainIntelligence';
import textSummarizerRouter from './routes/dev-utilities-api/routes/textSummarizer';
import keywordExtractorRouter from './routes/dev-utilities-api/routes/keywordExtractor';
import toneAnalyzerRouter from './routes/dev-utilities-api/routes/toneAnalyzer';
import addressValidationRouter from './routes/dev-utilities-api/routes/addressValidation';
import coldOutreachRouter from './routes/dev-utilities-api/routes/coldOutreach';
import companyEnrichmentRouter from './routes/dev-utilities-api/routes/companyEnrichment';
import creditCardValidatorRouter from './routes/dev-utilities-api/routes/creditCardValidator';
import decisionExplanationRouter from './routes/dev-utilities-api/routes/decisionExplanation';
import executionPlannerRouter from './routes/dev-utilities-api/routes/executionPlanner';
import followUpSequenceRouter from './routes/dev-utilities-api/routes/followUpSequence';
import ibanValidationRouter from './routes/dev-utilities-api/routes/ibanValidation';
import jobDescriptionAnalyzerRouter from './routes/dev-utilities-api/routes/jobDescriptionAnalyzer';
import passwordStrengthRouter from './routes/dev-utilities-api/routes/passwordStrength';
import pricingIntelligenceRouter from './routes/dev-utilities-api/routes/pricingIntelligence';
import promptOptimizerRouter from './routes/dev-utilities-api/routes/promptOptimizer';
import readabilityScorerRouter from './routes/dev-utilities-api/routes/readabilityScorer';
import taskCostEstimationRouter from './routes/dev-utilities-api/routes/taskCostEstimation';
import textCleanRouter from './routes/dev-utilities-api/routes/textClean';
import vatValidationRouter from './routes/dev-utilities-api/routes/vatValidation';
import whoToContactRouter from './routes/dev-utilities-api/routes/whoToContact';
app.use('/dev-utilities', urlMetadataRouter);
app.use('/dev-utilities', emailExtractorRouter);
app.use('/dev-utilities', domainIntelligenceRouter);
app.use('/dev-utilities', textSummarizerRouter);
app.use('/dev-utilities', keywordExtractorRouter);
app.use('/dev-utilities', toneAnalyzerRouter);
app.use('/dev-utilities', addressValidationRouter);
app.use('/dev-utilities', coldOutreachRouter);
app.use('/dev-utilities', companyEnrichmentRouter);
app.use('/dev-utilities', creditCardValidatorRouter);
app.use('/dev-utilities', decisionExplanationRouter);
app.use('/dev-utilities', executionPlannerRouter);
app.use('/dev-utilities', followUpSequenceRouter);
app.use('/dev-utilities', ibanValidationRouter);
app.use('/dev-utilities', jobDescriptionAnalyzerRouter);
app.use('/dev-utilities', passwordStrengthRouter);
app.use('/dev-utilities', pricingIntelligenceRouter);
app.use('/dev-utilities', promptOptimizerRouter);
app.use('/dev-utilities', readabilityScorerRouter);
app.use('/dev-utilities', taskCostEstimationRouter);
app.use('/dev-utilities', textCleanRouter);
app.use('/dev-utilities', vatValidationRouter);
app.use('/dev-utilities', whoToContactRouter);

// ── Document Intelligence ─────────────────────────────────────────────────────
import { extractRouter } from './routes/document-intelligence-api/routes/extract.route';
app.use('/document-intelligence', extractRouter);

// ── Email Validation ──────────────────────────────────────────────────────────
app.use('/email-validation', emailValidationInfoRouter);
app.use('/phone-validation', phoneValidationInfoRouter);
app.use('/search-extract', searchExtractInfoRouter);
app.use('/token-trust', tokenTrustInfoRouter);
app.use('/trust', trustInfoRouter);
app.use('/user-risk', userRiskInfoRouter);
app.use('/wallet-intelligence', walletIntelligenceInfoRouter);

import { validateRouter } from './routes/email-validation-api/routes/validate.route';
app.use('/email-validation', validateRouter);

// ── Extraction ────────────────────────────────────────────────────────────────
import extractionRouter from './routes/extraction-api/routes/extract';
app.use('/extraction', extractionRouter);

// ── Identity Intelligence ─────────────────────────────────────────────────────
import { analyzeRouter } from './routes/identity-intelligence-api/routes/analyze.route';
app.use('/identity-intelligence', analyzeRouter);

// ── Image to Content ──────────────────────────────────────────────────────────
import { analyzeRouter as imageAnalyzeRouter } from './routes/image-to-content-api/routes/analyze.route';
app.use('/image-to-content', imageAnalyzeRouter);

// ── IP Intelligence ───────────────────────────────────────────────────────────
import { lookupRouter } from './routes/ip-intelligence-api/routes/lookup.route';
app.use('/ip-intelligence', ipIntelligenceInfoRouter);
app.use('/ip-intelligence', lookupRouter);

// ── Lead Discovery ────────────────────────────────────────────────────────────
import leadsRouter from './routes/lead-discovery-api/routes/leads';
app.use('/lead-discovery', leadsRouter);

// ── Lead Enrichment ───────────────────────────────────────────────────────────
import { enrichRouter } from './routes/lead-enrichment-api/routes/enrich.route';
app.use('/lead-enrichment', enrichRouter);

// ── Lead Quality ──────────────────────────────────────────────────────────────
import { scoreRouter } from './routes/lead-quality-api/routes/score.route';
app.use('/lead-quality', scoreRouter);

// ── Market Intelligence ───────────────────────────────────────────────────────
import marketIntelligenceRouter from './routes/market-intelligence-api/routes/intelligence';
app.use('/market-intelligence', marketIntelligenceRouter);

// ── Market Signal ─────────────────────────────────────────────────────────────
import marketSignalRouter from './routes/market-signal-api/routes/signal';
app.use('/market-signal', marketSignalRouter);

// ── Market Trigger ────────────────────────────────────────────────────────────
import marketTriggerRouter from './routes/market-trigger-api/routes/trigger';
app.use('/market-trigger', marketTriggerRouter);

// ── Market Webhook ────────────────────────────────────────────────────────────
import marketWebhookRouter from './routes/market-webhook-api/routes/webhooks';
app.use('/market-webhook', marketWebhookInfoRouter);
app.use('/market-webhook', marketWebhookRouter);

// ── Onchain Signal ────────────────────────────────────────────────────────────
import onchainTokenRouter from './routes/onchain-signal-api/routes/token';
import onchainWalletRouter from './routes/onchain-signal-api/routes/wallet';
import onchainWhaleRouter from './routes/onchain-signal-api/routes/whale';
app.use('/onchain-signal', onchainTokenRouter);
app.use('/onchain-signal', onchainWalletRouter);
app.use('/onchain-signal', onchainWhaleRouter);

// ── Phone Validation ──────────────────────────────────────────────────────────
import { validateRouter as phoneValidateRouter } from './routes/phone-validation-api/routes/validate.route';
app.use('/phone-validation', phoneValidateRouter);

// ── Portfolio Rebalance ───────────────────────────────────────────────────────
import rebalanceRouter from './routes/portfolio-rebalance-api/routes/rebalance';
import strategiesRouter from './routes/portfolio-rebalance-api/routes/strategies';
app.use('/portfolio-rebalance/rebalance', rebalanceRouter);
app.use('/portfolio-rebalance/strategies', strategiesRouter);

// ── Search Extract ────────────────────────────────────────────────────────────
import { searchRouter } from './routes/search-extract-api/routes/search.route';
app.use('/search-extract', searchRouter);

// ── Stablecoin Yield ──────────────────────────────────────────────────────────
import stablecoinRatesRouter from './routes/stablecoin-yield-api/routes/rates';
import stablecoinBestYieldRouter from './routes/stablecoin-yield-api/routes/bestYield';
import stablecoinCompareRouter from './routes/stablecoin-yield-api/routes/compare';
import stablecoinProtocolRouter from './routes/stablecoin-yield-api/routes/protocol';
app.use('/stablecoin-yield/rates', stablecoinRatesRouter);
app.use('/stablecoin-yield/best', stablecoinBestYieldRouter);
app.use('/stablecoin-yield/compare', stablecoinCompareRouter);
app.use('/stablecoin-yield/protocol', stablecoinProtocolRouter);

// ── Strategy Execution ────────────────────────────────────────────────────────
import strategyExecutionRouter from './routes/strategy-execution-api/routes/strategy';
app.use('/strategy-execution', strategyExecutionRouter);

// ── Token Trust ───────────────────────────────────────────────────────────────
import { tokenRouter } from './routes/token-trust-api/routes/token.route';
app.use('/token-trust', tokenRouter);

// ── Trust ─────────────────────────────────────────────────────────────────────
import { trustRouter } from './routes/trust-api/routes/trust.route';
app.use('/trust', trustRouter);

// ── Unified Decision ──────────────────────────────────────────────────────────
import unifiedDecisionRouter from './routes/unified-decision-api/routes/decide';
app.use('/unified-decision', unifiedDecisionRouter);

// ── User Risk ─────────────────────────────────────────────────────────────────
import { riskRouter } from './routes/user-risk-api/routes/risk.route';
app.use('/user-risk', riskRouter);

// ── Wallet Intelligence ───────────────────────────────────────────────────────
import { walletRouter } from './routes/wallet-intelligence-api/routes/wallet.route';
app.use('/wallet-intelligence', walletRouter);

// ── Website Monitor ───────────────────────────────────────────────────────────
import monitorsRouter from './routes/website-monitor-api/routes/monitors';
app.use('/website-monitor', websiteMonitorInfoRouter);
app.use('/website-monitor', monitorsRouter);

// ── Social Sentiment ─────────────────────────────────────────────────────────
import socialSentimentRouter from './routes/social-sentiment/index';
app.use('/social-sentiment', socialSentimentRouter);

// ── Gas Optimizer ──────────────────────────────────────────────────────────
import gasNowRouter from "./routes/gas-optimizer-api/routes/gasNow";
import gasEstimateRouter from "./routes/gas-optimizer-api/routes/gasEstimate";
import gasCompareRouter from "./routes/gas-optimizer-api/routes/gasCompare";
import gasTimingRouter from "./routes/gas-optimizer-api/routes/gasTiming";
// ── API Info Routes ───────────────────────────────────────────────────────────
app.use('/gas-optimizer', gasOptimizerInfoRouter);
app.use('/funding-rate', fundingRateInfoRouter);
app.use('/strategy-signal', strategySignalInfoRouter);
app.use('/prediction-market', predictionMarketInfoRouter);
app.use('/token-screener', tokenScreenerInfoRouter);
app.use('/token-unlock', tokenUnlockInfoRouter);
app.use('/agent-identity', agentIdentityInfoRouter);
app.use('/crypto-narrative', cryptoNarrativeInfoRouter);
app.use('/defi-risk', defiRiskInfoRouter);
app.use('/crypto-alerts', cryptoAlertsInfoRouter);
app.use('/agent-skills', agentSkillsInfoRouter);
app.use('/defi-position-monitor', defiPositionInfoRouter);
app.use('/wallet-portfolio', walletPortfolioInfoRouter);
app.use('/cross-chain-bridge', crossChainInfoRouter);
app.get('/cross-chain-bridge/info', (_req, res) => {
  res.json({
    name: 'Agent Cross-Chain Execution & Bridge Intelligence API',
    version: '2.0.0',
    description: 'Real-time cross-chain bridge intelligence for autonomous agents. Compare routes, score bridges, estimate slippage, monitor conditions, and gate execution — powered by live LI.FI data across 30+ chains.',
    category: 'blockchain-web3',
    loop_type: 'compare_score_estimate_monitor_gate_execute',
    monetization_grade: 'A',
    primary_use_case: 'Agent cross-chain bridge selection and execution gating',
    baseUrl: 'https://orbis-apis.onrender.com/cross-chain-bridge',
    website: 'https://orbis-apis.onrender.com',
    docs: 'https://orbis-apis.onrender.com/cross-chain-bridge/docs',
    openapi: 'https://orbis-apis.onrender.com/cross-chain-bridge/openapi.json',
    pricing: {
      '/compare-routes': 0.003,
      '/score-route': 0.0025,
      '/estimate-slippage': 0.002,
      '/monitor-bridge': 0.002,
      '/execution-gate': 0.0045
    },
    endpoints: [
      { method: 'POST', url: 'https://orbis-apis.onrender.com/cross-chain-bridge/compare-routes', description: 'Compare routes with AI scoring: value, speed, safety scores and recommendation.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/cross-chain-bridge/score-route', description: 'Score a route across fee, speed, safety, liquidity. Returns grade and safe_to_use.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/cross-chain-bridge/estimate-slippage', description: 'Estimate slippage and total cost. Returns slippage_level and safe_to_proceed.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/cross-chain-bridge/monitor-bridge', description: 'Monitor bridge conditions. Returns alert_level and next_check_ms.' },
      { method: 'POST', url: 'https://orbis-apis.onrender.com/cross-chain-bridge/execution-gate', description: 'Execution gate: checks fees and slippage, returns execute bool and chains to Autopilot.' },
    ]
  });
});
app.use('/derivatives', derivativesInfoRouter);
app.use('/market-correlation', marketCorrelationInfoRouter);
app.use('/yield-farming', yieldFarmingInfoRouter);
app.use('/tokenomics', tokenomicsInfoRouter);
app.use('/liquidation-feed', liquidationFeedInfoRouter);
app.use('/market-stress', marketStressInfoRouter);
app.use('/wallet', walletInfoRouter);
app.use('/stablecoin-yield', stablecoinYieldInfoRouter);
app.use('/meta-strategy', metaStrategyInfoRouter);
app.use('/social-sentiment', socialSentimentInfoRouter);
app.use('/action', actionInfoRouter);
app.use("/action", actionRouter);
app.use("/action", actionTaskTypesRouter);
app.use('/agent-workflow', agentWorkflowInfoRouter);
app.use('/agent-workflow', workflowRouter);
app.use('/crypto-news-impact', cryptoNewsInfoRouter);
app.use('/derivatives-intelligence', derivativesIntelligenceInfoRouter);
app.use('/dev-utilities', devUtilitiesInfoRouter);
app.use('/extraction', extractionInfoRouter);
app.use('/lead-discovery', leadDiscoveryInfoRouter);
app.use('/market-intelligence', marketIntelligenceInfoRouter);
app.use('/market-signal', marketSignalInfoRouter);
app.use('/market-trigger', marketTriggerInfoRouter);
app.use('/onchain-signal', onchainSignalInfoRouter);
app.use('/portfolio-rebalance', portfolioRebalanceInfoRouter);
app.use('/strategy-execution', strategyExecutionInfoRouter);
app.use('/unified-decision', unifiedDecisionInfoRouter);
app.use('/document-intelligence', documentIntelligenceInfoRouter);
app.use('/identity-intelligence', identityIntelligenceInfoRouter);
app.use('/image-to-content', imageToContentInfoRouter);
app.use('/lead-enrichment', leadEnrichmentInfoRouter);
app.use('/lead-quality', leadQualityInfoRouter);



app.use("/gas-optimizer/now", gasNowRouter);
app.use("/gas-optimizer/estimate", gasEstimateRouter);
app.use("/gas-optimizer/compare", gasCompareRouter);
app.use("/gas-optimizer/timing", gasTimingRouter);


// ── Strategy Signal ───────────────────────────────────────────────────────────
import strategySignalRouter from './routes/strategy-signal-api/routes/strategy';
app.use('/strategy-signal', strategySignalRouter);

// ── Prediction Market ─────────────────────────────────────────────────────────
import predictionTrendingRouter from './routes/prediction-market-api/routes/trending';
import predictionSearchRouter from './routes/prediction-market-api/routes/search';
import predictionMarketRouter from './routes/prediction-market-api/routes/market';
import predictionSignalRouter from './routes/prediction-market-api/routes/signal';
app.use('/prediction-market/trending', predictionTrendingRouter);
app.use('/prediction-market/search', predictionSearchRouter);
app.use('/prediction-market/signal', predictionSignalRouter);
app.use('/prediction-market/detail', predictionMarketRouter);

// ── Funding Rate ──────────────────────────────────────────────────────────────
import fundingNowRouter from './routes/funding-rate-api/routes/now';
import fundingCompareRouter from './routes/funding-rate-api/routes/compare';
import fundingExtremesRouter from './routes/funding-rate-api/routes/extremes';
import fundingSignalRouter from './routes/funding-rate-api/routes/signal';
app.use('/funding-rate/rates/now', fundingNowRouter);
app.use('/funding-rate/rates/compare', fundingCompareRouter);
app.use('/funding-rate/rates/extremes', fundingExtremesRouter);
app.use('/funding-rate/rates/signal', fundingSignalRouter);

// ── Gas Optimizer ─────────────────────────────────────────────────────────────

// ── Token Screener ────────────────────────────────────────────────────────────
import tokenScreenRouter from './routes/token-screener-api/routes/screen';
import tokenMoversRouter from './routes/token-screener-api/routes/movers';
import tokenOpportunitiesRouter from './routes/token-screener-api/routes/opportunities';
app.use('/token-screener/screen', tokenScreenRouter);
app.use('/token-screener/movers', tokenMoversRouter);
app.use('/token-screener/opportunities', tokenOpportunitiesRouter);

// ── Meta Strategy ─────────────────────────────────────────────────────────────
import metaStrategyScanRouter from './routes/meta-strategy-api/routes/scan';
app.use('/meta-strategy/scan', metaStrategyScanRouter);

// ── Token Unlock ──────────────────────────────────────────────────────────────
import tokenUnlockUpcomingRouter from './routes/token-unlock-api/routes/upcoming';
import tokenUnlockVestingRouter from './routes/token-unlock-api/routes/vesting';
import tokenUnlockImpactRouter from './routes/token-unlock-api/routes/impact';
import tokenUnlockCalendarRouter from './routes/token-unlock-api/routes/calendar';
app.use('/token-unlock/upcoming', tokenUnlockUpcomingRouter);
app.use('/token-unlock/vesting', tokenUnlockVestingRouter);
app.use('/token-unlock/impact', tokenUnlockImpactRouter);
app.use('/token-unlock/calendar', tokenUnlockCalendarRouter);

// ── Agent Identity ────────────────────────────────────────────────────────────
import agentIdentityRouter from './apis/agent-identity/routes';
app.use('/agent-identity', agentIdentityRouter);

// ── Crypto Narrative ──────────────────────────────────────────────────────────
import cryptoNarrativeTrendingRouter from './routes/crypto-narrative-api/routes/trending';
import cryptoNarrativeRouter from './routes/crypto-narrative-api/routes/narrative';
import cryptoNarrativeCompareRouter from './routes/crypto-narrative-api/routes/compare';
import cryptoNarrativeScanRouter from './routes/crypto-narrative-api/routes/scan';
app.use('/crypto-narrative/trending', cryptoNarrativeTrendingRouter);
app.use('/crypto-narrative/narrative', cryptoNarrativeRouter);
app.use('/crypto-narrative/compare', cryptoNarrativeCompareRouter);
app.use('/crypto-narrative/scan', cryptoNarrativeScanRouter);

// ── DeFi Risk ─────────────────────────────────────────────────────────────────
import defiRiskTokenSafetyRouter from './routes/defi-risk-api/routes/tokenSafety';
import defiRiskProtocolRouter from './routes/defi-risk-api/routes/protocolRisk';
import defiRiskLiquidityRouter from './routes/defi-risk-api/routes/liquidityHealth';
import defiRiskPortfolioRouter from './routes/defi-risk-api/routes/portfolioScan';
app.use('/defi-risk/token-safety', defiRiskTokenSafetyRouter);
app.use('/defi-risk/protocol', defiRiskProtocolRouter);
app.use('/defi-risk/liquidity', defiRiskLiquidityRouter);
app.use('/defi-risk/portfolio', defiRiskPortfolioRouter);

// ── Crypto Alerts ─────────────────────────────────────────────────────────────
import cryptoAlertsRouter from './routes/crypto-alerts-api/index';
app.get('/crypto-alerts/info', (_req, res) => {
  res.json({
    name: 'Agent Crypto Trigger & Market Alert API',
    slug: 'crypto-alerts',
    version: 'v2',
    status: 'agent',
    loop_type: 'create_check_score_route_gate_execute',
    monetization_grade: 'A',
    category: 'blockchain-web3',
    description: 'Agent-native market trigger system that creates structured triggers, evaluates conditions against live prices, scores urgency and market impact, routes fired alerts to the correct execution path, and gates autonomous agent actions.',
    baseUrl: 'https://orbis-apis.onrender.com/crypto-alerts',
    websiteUrl: 'https://orbis-apis.onrender.com',
    pricing: {
      agent_pay_per_call: {
        '/create-trigger':  0.0025,
        '/check-triggers':  0.0015,
        '/score-trigger':   0.0025,
        '/route-alert':     0.003,
        '/execution-gate':  0.004,
        '/monitor-alerts':  0.002,
        '/summarize-alert': 0.0015,
      },
      high_volume_agent: {
        '/create-trigger':  0.001,
        '/check-triggers':  0.0006,
        '/score-trigger':   0.001,
        '/route-alert':     0.0012,
        '/execution-gate':  0.0018,
        '/monitor-alerts':  0.0008,
        '/summarize-alert': 0.0006,
      },
    },
    endpoints: [
      { method: 'POST', path: '/create-trigger' },
      { method: 'POST', path: '/check-triggers' },
      { method: 'POST', path: '/score-trigger' },
      { method: 'POST', path: '/route-alert' },
      { method: 'POST', path: '/execution-gate' },
      { method: 'POST', path: '/monitor-alerts' },
      { method: 'POST', path: '/summarize-alert' },
    ],
    execution_chain: [
      'crypto-alerts/execution-gate',
      'autopilot/should-execute',
      'action-api/execute',
    ],
  });
});
app.use('/crypto-alerts', cryptoAlertsRouter);

// ── Agent Skills ──────────────────────────────────────────────────────────────
import agentSkillsRegisterRouter from './routes/agent-skills-api/routes/register';
import agentSkillsDiscoverRouter from './routes/agent-skills-api/routes/discover';
import agentSkillsDetailRouter from './routes/agent-skills-api/routes/skillDetail';
import agentSkillsMatchRouter from './routes/agent-skills-api/routes/match';
import agentSkillsTrendingRouter from './routes/agent-skills-api/routes/trending';
import agentSkillsComposeRouter from './routes/agent-skills-api/routes/compose';
app.use('/agent-skills/register', agentSkillsRegisterRouter);
app.use('/agent-skills/discover', agentSkillsDiscoverRouter);
app.use('/agent-skills/detail', agentSkillsDetailRouter);
app.use('/agent-skills/match', agentSkillsMatchRouter);
app.use('/agent-skills/compose', agentSkillsComposeRouter);
app.use('/agent-skills/trending', agentSkillsTrendingRouter);

// ── DeFi Position Monitor ─────────────────────────────────────────────────────
import defiPositionMonitorRouter from './routes/defi-position-monitor-api/index';
app.get('/defi-position-monitor/info', (_req, res) => {
  res.json({
    name: 'Agent DeFi Position Risk & Liquidation Defense API',
    slug: 'defi-position-monitor',
    version: 'v2',
    status: 'agent',
    loop_type: 'liquidation_defense_loop',
    monetization_grade: 'A',
    category: 'blockchain-web3',
    description: 'Detect DeFi position risk, score health factors, identify liquidation proximity, recommend defensive actions, generate rebalance plans, and gate execution before autonomous agents act.',
    baseUrl: 'https://orbis-apis.onrender.com/defi-position-monitor',
    websiteUrl: 'https://orbis-apis.onrender.com',
    pricing: {
      agent_pay_per_call: {
        '/scan-position':           0.0035,
        '/score-health':            0.0025,
        '/detect-liquidation-risk': 0.0045,
        '/recommend-action':        0.004,
        '/rebalance-plan':          0.005,
        '/execution-gate':          0.0045,
        '/monitor-position':        0.002,
        '/summarize-position':      0.0025,
      },
      high_volume_agent: {
        '/scan-position':           0.0015,
        '/score-health':            0.001,
        '/detect-liquidation-risk': 0.002,
        '/recommend-action':        0.0018,
        '/rebalance-plan':          0.0022,
        '/execution-gate':          0.002,
        '/monitor-position':        0.0008,
        '/summarize-position':      0.001,
      },
    },
    endpoints: [
      { method: 'POST', path: '/scan-position' },
      { method: 'POST', path: '/score-health' },
      { method: 'POST', path: '/detect-liquidation-risk' },
      { method: 'POST', path: '/recommend-action' },
      { method: 'POST', path: '/rebalance-plan' },
      { method: 'POST', path: '/execution-gate' },
      { method: 'POST', path: '/monitor-position' },
      { method: 'POST', path: '/summarize-position' },
    ],
    execution_chain: [
      'defi-position-monitor/execution-gate',
      'autopilot/should-execute',
      'cross-chain-bridge/execution-gate',
      'action-api/execute',
    ],
  });
});
app.use('/defi-position-monitor', defiPositionMonitorRouter);

// ── Wallet Portfolio ──────────────────────────────────────────────────────────
import walletPortfolioSnapshotRouter from './routes/wallet-portfolio-api/routes/snapshot';
import walletPortfolioPnlRouter from './routes/wallet-portfolio-api/routes/pnl';
import walletPortfolioScoreRouter from './routes/wallet-portfolio-api/routes/score';
app.use('/wallet-portfolio/snapshot', walletPortfolioSnapshotRouter);
app.use('/wallet-portfolio/pnl', walletPortfolioPnlRouter);
app.use('/wallet-portfolio/score', walletPortfolioScoreRouter);

// ── Cross Chain Bridge ────────────────────────────────────────────────────────
import { router as crossChainRouter } from './routes/cross-chain-bridge-api/routes';
app.use('/cross-chain-bridge', crossChainRouter);

// ── Derivatives ───────────────────────────────────────────────────────────────
import { router as derivativesRouter } from './routes/derivatives-api/routes';
app.use('/derivatives', derivativesRouter);

// ── Market Correlation ────────────────────────────────────────────────────────
import { router as marketCorrelationRouter } from './routes/market-correlation-api/routes';
app.use('/market-correlation', marketCorrelationRouter);

// ── Yield Farming ─────────────────────────────────────────────────────────────
import { router as yieldFarmingRouter } from './routes/yield-farming-api/routes';
app.use('/yield-farming', yieldFarmingRouter);

// ── Derivatives Intelligence ──────────────────────────────────────────────────
import { router as derivativesIntelligenceRouter } from './routes/derivatives-intelligence-api/routes';
app.use('/derivatives-intelligence', derivativesIntelligenceRouter);

// ── Tokenomics ────────────────────────────────────────────────────────────────
import { router as tokenomicsRouter } from './routes/tokenomics-api/routes';
app.use('/tokenomics', tokenomicsRouter);

// ── Liquidation Feed ──────────────────────────────────────────────────────────
import { router as liquidationFeedRouter } from './routes/liquidation-feed-api/routes';
app.use('/liquidation-feed', liquidationFeedRouter);

// ── Market Stress ─────────────────────────────────────────────────────────────
import { router as marketStressRouter } from './routes/market-stress-api/routes';
app.use('/market-stress', marketStressRouter);


// ── Decision Scorer ────────────────────────────────────────────────────────────
import decisionScorerRouter from "./routes/decision-scorer/routes/score";
app.use("/decision-scorer", decisionScorerInfoRouter);
app.use("/decision-scorer", decisionScorerRouter);

// ── Text Extractor ────────────────────────────────────────────────────────────
import textExtractorRouter from "./routes/text-extractor/routes/extract";
app.use("/text-extractor", textExtractorInfoRouter);
app.use("/text-extractor", textExtractorRouter);

// ── Web Researcher ────────────────────────────────────────────────────────────
import webResearcherRouter from "./routes/web-researcher/routes/research";
app.use("/web-researcher", webResearcherInfoRouter);
app.use("/web-researcher", webResearcherRouter);

// ── ENS Resolver ─────────────────────────────────────────────────────────────
import ensResolverRouter from "./routes/ens-resolver/routes/ens";
app.use("/ens-resolver", ensResolverInfoRouter);
app.use("/ens-resolver", ensResolverRouter);

// ── Onchain News ─────────────────────────────────────────────────────────────
import onchainNewsRouter from "./routes/onchain-news/routes/news";
app.use("/onchain-news", onchainNewsInfoRouter);
app.use("/onchain-news", onchainNewsRouter);

// ── Contract Analyzer ─────────────────────────────────────────────────────────
import contractAnalyzerRouter from "./routes/contract-analyzer/routes/analyze";
app.use("/contract-analyzer", contractAnalyzerInfoRouter);
app.get("/contract-analyzer/info", (_req, res) => {
  res.json({
    name: "Agent Smart Contract Risk & Due Diligence API",
    version: "2.0.0",
    description: "Full-stack smart contract intelligence engine for autonomous agents. Scan, score risk, detect vulnerabilities, classify, compare, monitor, summarize findings, and rank contracts.",
    category: "blockchain-web3",
    loop_type: "scan_score_detect_classify_monitor_rank",
    monetization_grade: "A",
    primary_use_case: "Agent smart contract due diligence and security loops",
    baseUrl: "https://orbis-apis.onrender.com/contract-analyzer",
    website: "https://orbis-apis.onrender.com",
    docs: "https://orbis-apis.onrender.com/contract-analyzer/docs",
    openapi: "https://orbis-apis.onrender.com/contract-analyzer/openapi.json",
    pricing: {
      "/scan-contract": 0.004,
      "/score-risk": 0.0025,
      "/detect-vulnerabilities": 0.006,
      "/classify-contract": 0.002,
      "/compare-contracts": 0.0045,
      "/monitor-contract": 0.002,
      "/summarize-findings": 0.003,
      "/rank-contracts": 0.005
    },
    endpoints: [
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/scan-contract", description: "Full contract scan: risk level, flags, contract type, recommendations." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/score-risk", description: "Risk score across reentrancy, access control, overflow, centralization, upgrade risk." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/detect-vulnerabilities", description: "Detect exploitable vulnerabilities with severity and location." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/classify-contract", description: "Classify contract type, standards, upgradeability, admin controls." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/compare-contracts", description: "Compare 2-5 contracts by risk and trust score." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/monitor-contract", description: "Monitor for activity spikes, ownership changes, upgrades. Returns alert level." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/summarize-findings", description: "Agent-ready audit summary with verdict: approve|investigate|reject." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/rank-contracts", description: "Rank 2-10 contracts by safety, trust, activity, or defi_use." },
      { method: "POST", url: "https://orbis-apis.onrender.com/contract-analyzer/execution-gate", description: "Cross-API safety gate: returns execute bool, risk score, blocking flags, chain_context, and recommended_next_api for Autopilot." },
    ]
  });
});
app.use("/contract-analyzer", contractAnalyzerRouter);

// ── TX Simulator ─────────────────────────────────────────────────────────────
import txSimulatorRouter from "./routes/tx-simulator/routes/simulate";
app.use("/tx-simulator", txSimulatorInfoRouter);
app.use("/tx-simulator", txSimulatorRouter);

// ── Wallet Reputation ────────────────────────────────────────────────────────
import walletReputationRouter from "./routes/wallet-reputation/routes/reputation";
app.use("/wallet-reputation", walletReputationInfoRouter);
app.use("/wallet-reputation", walletReputationRouter);

// ── Token Price Feed ──────────────────────────────────────────────────────────
import tokenPriceFeedRouter from "./routes/token-price-feed/routes/price";
app.use("/token-price-feed", tokenPriceFeedInfoRouter);
app.use("/token-price-feed", tokenPriceFeedRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use("/nft-metadata", nftMetadataInfoRouter);
app.use("/nft-metadata", nftTokenRouter);
app.use("/nft-metadata", nftCollectionRouter);
app.use("/nft-metadata", nftWalletRouter);
app.use("/nft-metadata", nftTransfersRouter);
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
  console.log(`[orbis-apis] Running on port ${PORT}`);
});

export default app;

