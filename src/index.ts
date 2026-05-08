import serpIntelligenceRouter from './routes/serp-intelligence-api/routes/intelligence';
import serpIntelligenceOpenapiRouter from './routes/serp-intelligence-api/routes/openapi';
import localBusinessRouter from './routes/local-business-api/routes/intelligence';
import localBusinessOpenapiRouter from './routes/local-business-api/routes/openapi';
import competitorMonitorRouter from './routes/competitor-monitor-api/routes/intelligence';
import competitorMonitorOpenapiRouter from './routes/competitor-monitor-api/routes/openapi';
import coldOutreachApiRouter from './routes/cold-outreach-api/routes/intelligence';
import coldOutreachApiOpenapiRouter from './routes/cold-outreach-api/routes/openapi';
import leadScoringRouter from './routes/lead-scoring-api/routes/intelligence';
import leadScoringOpenapiRouter from './routes/lead-scoring-api/routes/openapi';
import emailIntelligenceRouter from './routes/email-intelligence-api/routes/intelligence';
import emailIntelligenceOpenapiRouter from './routes/email-intelligence-api/routes/openapi';
import pdfExtractionRouter from './routes/pdf-extraction-api/routes/intelligence';
import pdfExtractionOpenapiRouter from './routes/pdf-extraction-api/routes/openapi';
import 'dotenv/config';
import youtubeIntelligenceRouter from './routes/youtube-intelligence-api/routes/intelligence';
import youtubeIntelligenceOpenapiRouter from './routes/youtube-intelligence-api/routes/openapi';
import marketIntelligenceV2Router from './routes/market-data-api-v2/routes/intelligence';
import marketSignalV2OpenapiRouter from './routes/market-data-api-v2/routes/openapi';
import phoneOpenapiRouter from './routes/phone-validation-api/routes/openapi.route';
import { actionRouter, actionTaskTypesRouter } from './routes/action';
import { nftMetadataInfoRouter, nftTokenRouter, nftCollectionRouter, nftWalletRouter, nftTransfersRouter } from './routes/nft-metadata';
import { gasOptimizerInfoRouter, fundingRateInfoRouter, strategySignalInfoRouter, predictionMarketInfoRouter, tokenScreenerInfoRouter, tokenUnlockInfoRouter, agentIdentityInfoRouter, cryptoNarrativeInfoRouter, defiRiskInfoRouter, cryptoAlertsInfoRouter, agentSkillsInfoRouter, defiPositionInfoRouter, walletPortfolioInfoRouter, crossChainInfoRouter, derivativesInfoRouter, marketCorrelationInfoRouter, yieldFarmingInfoRouter, tokenomicsInfoRouter, liquidationFeedInfoRouter, marketStressInfoRouter, walletInfoRouter, stablecoinYieldInfoRouter, metaStrategyInfoRouter, socialSentimentInfoRouter, alphaSignalInfoRouter, actionInfoRouter, agentMemoryInfoRouter, agentWorkflowInfoRouter, autopilotInfoRouter, browserTaskInfoRouter, companyResearchInfoRouter, cryptoNewsInfoRouter, derivativesIntelligenceInfoRouter, devUtilitiesInfoRouter, extractionInfoRouter, leadDiscoveryInfoRouter, marketIntelligenceInfoRouter, marketSignalInfoRouter, marketTriggerInfoRouter, marketWebhookInfoRouter, onchainSignalInfoRouter, portfolioRebalanceInfoRouter, strategyExecutionInfoRouter, unifiedDecisionInfoRouter, websiteMonitorInfoRouter, aiOutputSafetyInfoRouter, documentIntelligenceInfoRouter, identityIntelligenceInfoRouter, imageToContentInfoRouter, leadEnrichmentInfoRouter, leadQualityInfoRouter, ipIntelligenceInfoRouter, emailValidationInfoRouter, phoneValidationInfoRouter, searchExtractInfoRouter, tokenTrustInfoRouter, trustInfoRouter, userRiskInfoRouter, walletIntelligenceInfoRouter, tokenPriceFeedInfoRouter, walletReputationInfoRouter, txSimulatorInfoRouter, contractAnalyzerInfoRouter, onchainNewsInfoRouter, ensResolverInfoRouter, webResearcherInfoRouter, textExtractorInfoRouter, decisionScorerInfoRouter , productDataInfoRouter, imageGenInfoRouter, webScraperInfoRouter, textGenInfoRouter, geocodingInfoRouter } from "./middleware/allApiInfo";
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-payment'] }));
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
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
    monetization_grade: 'A+',
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
app.use('/phone-validation/openapi.json', phoneOpenapiRouter);
app.use('/phone-validation', phoneValidationInfoRouter);
app.get('/phone-validation/info', (_req, res) => {
  res.json({
    name: 'Agent Phone Intelligence & Contact Verification API',
    slug: 'phone-validation',
    version: 'v2',
    status: 'agent',
    loop_type: 'validate_normalize_score_risk_carrier_gate_act',
    monetization_grade: 'A+',
    category: 'ai-ml',
    description: 'Validate, normalize, score, and risk-check phone numbers. Detect carrier risk, VoIP, disposable, and fake numbers. Gate autonomous contact workflows with execution-ready decisions.',
    baseUrl: 'https://orbis-apis.onrender.com/phone-validation',
    websiteUrl: 'https://orbis-apis.onrender.com',
    openapi: 'https://orbis-apis.onrender.com/phone-validation/openapi.json',
    pricing: {
      '/validate': 0.001,
      '/validate/batch': 0.002,
      '/score-phone': 0.003,
      '/risk-check': 0.004,
      '/normalize-contact': 0.002,
      '/detect-carrier-risk': 0.003,
      '/batch-score': 0.005,
      '/execution-gate': 0.004,
    },
    endpoints: [
      { method: 'POST', path: '/validate', description: 'Validate a phone number. Returns valid, E.164, country, line type, risk.' },
      { method: 'POST', path: '/validate/batch', description: 'Batch validate up to 100 phone numbers.' },
      { method: 'POST', path: '/score-phone', description: 'Score phone for contact quality, reachability, and recommended channel.' },
      { method: 'POST', path: '/risk-check', description: 'Fraud and risk detection. Returns fraud score, signals, allow/block decision.' },
      { method: 'POST', path: '/normalize-contact', description: 'Normalize phone to E.164, international, national formats. CRM-ready output.' },
      { method: 'POST', path: '/detect-carrier-risk', description: 'Detect carrier risk, SMS/call deliverability, spam likelihood.' },
      { method: 'POST', path: '/batch-score', description: 'Batch score up to 50 phones for risk, validity, and CRM readiness.' },
      { method: 'POST', path: '/execution-gate', description: 'Gate autonomous contact workflows. Returns execute bool, blocking flags, next API.' },
      { method: 'POST', path: '/register-webhook', description: 'Register webhook for contact risk alerts. Fires when risk score exceeds threshold.' },
    ],
    execution_chain: [
      'phone-validation/validate',
      'phone-validation/risk-check',
      'phone-validation/execution-gate',
      'autopilot/should-execute',
      'action-api/execute',
    ],
  });
});
app.use('/search-extract', searchExtractInfoRouter);
app.use('/token-trust', tokenTrustInfoRouter);
app.use('/trust', trustInfoRouter);
app.use('/user-risk', userRiskInfoRouter);
app.use('/wallet-intelligence', walletIntelligenceInfoRouter);

import { validateRouter } from './routes/email-validation-api/routes/validate.route';
app.use('/email-validation', validateRouter);

// ── Extraction ────────────────────────────────────────────────────────────────
import extractionRouter from './routes/extraction-api/routes/extract';
import intelligenceRouter from './routes/extraction-api/routes/intelligence';
import resumeRouter from './routes/resume-api/routes/resume';
import resumeOpenapiRouter from './routes/resume-api/routes/openapi';
import extractionOpenapiRouter from './routes/extraction-api/routes/openapi';
app.use('/extraction', extractionRouter);
app.use('/extraction', intelligenceRouter);
app.use('/resume', resumeRouter);
app.use('/resume/openapi.json', resumeOpenapiRouter);
app.use('/extraction/openapi.json', extractionOpenapiRouter);

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
import marketIntelligenceOpenapiRouter from './routes/market-intelligence-api/routes/openapi';
app.use('/market-intelligence/openapi.json', marketIntelligenceOpenapiRouter);
app.use('/market-intelligence', marketIntelligenceRouter);
app.use('/market-signal-v2/openapi.json', marketSignalV2OpenapiRouter);
app.use('/market-signal-v2', marketIntelligenceV2Router);

// ── Market Signal ─────────────────────────────────────────────────────────────
import marketSignalRouter from './routes/market-signal-api/routes/signal';
import marketSignalOpenapiRouter from './routes/market-signal-api/routes/openapi';
app.use('/market-signal/openapi.json', marketSignalOpenapiRouter);
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
import { intelligenceRouter as phoneIntelligenceRouter } from './routes/phone-validation-api/routes/intelligence.route';
app.use('/phone-validation', phoneValidateRouter);
app.use('/phone-validation', phoneIntelligenceRouter);

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
app.get('/extraction/info', (_req, res) => {
  res.json({
    name: 'Agent Intelligence Extraction & Monitoring API',
    slug: 'extraction',
    version: 'v2',
    status: 'agent',
    loop_type: 'extract_signal_detect_monitor_stream_webhook_gate_act',
    monetization_grade: 'A+',
    category: 'ai-ml',
    description: 'Extract structured intelligence from any URL or text. Pull entities, actionable signals, and opportunities. Detect page changes, register continuous monitoring, and gate autonomous agent execution.',
    baseUrl: 'https://orbis-apis.onrender.com/extraction',
    websiteUrl: 'https://orbis-apis.onrender.com',
    openapi: 'https://orbis-apis.onrender.com/extraction/openapi.json',
    pricing: {
      '/v1/extract/lead': 0.001,
      '/v1/extract/invoice': 0.001,
      '/v1/extract/resume': 0.001,
      '/v1/extract/contract': 0.001,
      '/v1/extract/receipt': 0.001,
      '/v1/extract/custom': 0.0015,
      '/extract-entities': 0.004,
      '/extract-signals': 0.005,
      '/detect-change': 0.004,
      '/monitor-page': 0.003,
      '/extract-opportunities': 0.006,
      '/monitor-topic': 0.007,
      '/execution-gate': 0.005,
      '/register-webhook': 0.002,
      '/monitor-status': 0.001,
      '/monitor-cancel': 0.001,
      '/stream': 0.003,
    },
    endpoints: [
      { method: 'POST', path: '/extract-entities', description: 'Pull people, companies, prices, events and locations from any URL or text.' },
      { method: 'POST', path: '/extract-signals', description: 'Extract actionable intelligence signals (hiring, funding, partnership, launch) from content.' },
      { method: 'POST', path: '/detect-change', description: 'Compare current page vs cached baseline. Returns what changed and alert level.' },
      { method: 'POST', path: '/monitor-page', description: 'Register a URL for monitoring. Captures baseline and defines watch targets.' },
      { method: 'POST', path: '/extract-opportunities', description: 'Surface ranked opportunities from any content.' },
      { method: 'POST', path: '/monitor-topic', description: 'Watch a topic across multiple URLs. Returns signals, sentiment, trend and narrative.' },
      { method: 'POST', path: '/execution-gate', description: 'Gate autonomous agent execution. Returns execute bool, confidence, risk level, blocking flags and next API.' },
      { method: 'POST', path: '/register-webhook', description: 'Register a webhook to receive alerts when a monitored URL changes.' },
      { method: 'POST', path: '/monitor-status', description: 'Check the status of a registered monitor by id or url.' },
      { method: 'POST', path: '/monitor-cancel', description: 'Cancel an active monitor by id or url.' },
      { method: 'GET',  path: '/stream', description: 'SSE stream — real-time change detection events for a URL. Connect and receive heartbeat, change, and baseline events.' },
    ],
    execution_chain: [
      'extraction/extract-signals',
      'extraction/detect-change',
      'extraction/execution-gate',
      'autopilot/should-execute',
      'action-api/execute',
    ],
  });
});

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


// ── Resume API Info ───────────────────────────────────────────────────────────
app.get('/resume/info', (_req, res) => {
  res.json({
    name: 'Agent Career Optimization & Resume Intelligence API',
    slug: 'resume',
    version: 'v2',
    status: 'agent',
    loop_type: 'analyze_score_match_gap_optimize_rewrite_gate_apply',
    monetization_grade: 'A+',
    category: 'ai-ml',
    description: 'AI-powered resume analysis, ATS scoring, job matching, gap detection, bullet rewriting, cover letter generation, and execution-gated application readiness — built for autonomous agent workflows.',
    baseUrl: 'https://orbis-apis.onrender.com/resume',
    websiteUrl: 'https://orbis-apis.onrender.com',
    openapi: 'https://orbis-apis.onrender.com/resume/openapi.json',
    pricing: {
      '/analyze-resume': 0.004,
      '/score-resume': 0.002,
      '/match-job': 0.004,
      '/optimize-for-ats': 0.006,
      '/generate-bullets': 0.003,
      '/rewrite-summary': 0.003,
      '/gap-analysis': 0.005,
      '/cover-letter': 0.006,
      '/execution-gate': 0.005,
      '/rank-jobs': 0.005,
      '/application-plan': 0.005,
      '/monitor-jobs': 0.004,
      '/register-webhook': 0.002,
    },
    endpoints: [
      { method: 'POST', path: '/analyze-resume', description: 'Full resume analysis: scores, strengths, weaknesses, section feedback, vague phrases.' },
      { method: 'POST', path: '/score-resume', description: 'Score resume across ATS, readability, impact, completeness. Returns grade and verdict.' },
      { method: 'POST', path: '/match-job', description: 'Match resume to job description. Returns match score, gaps, ATS probability.' },
      { method: 'POST', path: '/optimize-for-ats', description: 'Rewrite resume for ATS optimization. Returns optimized text and changes made.' },
      { method: 'POST', path: '/generate-bullets', description: 'Rewrite weak bullet points to be results-driven and impactful.' },
      { method: 'POST', path: '/rewrite-summary', description: 'Rewrite or generate a powerful professional summary.' },
      { method: 'POST', path: '/gap-analysis', description: 'Detect skill, experience, education gaps vs job description. Returns priority actions.' },
      { method: 'POST', path: '/cover-letter', description: 'Generate a tailored cover letter from resume and job description.' },
      { method: 'POST', path: '/execution-gate', description: 'Gate autonomous job application. Returns execute bool, blocking flags, and next API.' },
      { method: 'POST', path: '/rank-jobs', description: 'Rank job postings against candidate resume. Returns ranked list with match scores and recommendations.' },
      { method: 'POST', path: '/application-plan', description: 'Generate execution-ready application plan with prioritized steps and timeline.' },
      { method: 'POST', path: '/monitor-jobs', description: 'Monitor target roles and surface matching opportunities with alert levels.' },
      { method: 'POST', path: '/register-webhook', description: 'Register webhook for job-match and application-readiness events.' },
    ],
    execution_chain: [
      'resume/analyze-resume',
      'resume/match-job',
      'resume/gap-analysis',
      'resume/optimize-for-ats',
      'resume/execution-gate',
      'autopilot/should-execute',
    ],
  });
});
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use("/nft-metadata", nftMetadataInfoRouter);
app.use("/nft-metadata", nftTokenRouter);
app.use("/nft-metadata", nftCollectionRouter);
app.use("/nft-metadata", nftWalletRouter);
app.use("/nft-metadata", nftTransfersRouter);
import productDataRouter from './routes/productdata-api/index';
app.use('/product-data', productDataInfoRouter);
app.get('/product-data/info', (_req, res) => {
  res.json({
    name: 'Agent Product Data Extraction & Commerce Intelligence API',
    slug: 'product-data',
    version: 'v2',
    status: 'agent',
    loop_type: 'extract_normalize_compare_score_monitor_detect_summarize_act',
    monetization_grade: 'A',
    category: 'ai-ml',
    description: 'Extract, normalize, compare, score, monitor, and gate commerce data for autonomous agents.',
    baseUrl: 'https://orbis-apis.onrender.com/product-data',
    websiteUrl: 'https://orbis-apis.onrender.com',
    pricing: {
      agent_pay_per_call: {
        '/extract-product':       0.003,
        '/extract-batch':         0.008,
        '/normalize-product':     0.0015,
        '/compare-products':      0.0035,
        '/score-listing-quality': 0.0025,
        '/detect-price-change':   0.002,
        '/monitor-product':       0.0015,
        '/summarize-product':     0.002,
        '/execution-gate':        0.003,
      },
      high_volume_agent: {
        '/extract-product':       0.0012,
        '/extract-batch':         0.0035,
        '/normalize-product':     0.0006,
        '/compare-products':      0.0015,
        '/score-listing-quality': 0.001,
        '/detect-price-change':   0.0008,
        '/monitor-product':       0.0006,
        '/summarize-product':     0.0008,
        '/execution-gate':        0.0012,
      },
    },
    endpoints: [
      { method: 'POST', path: '/extract-product' },
      { method: 'POST', path: '/extract-batch' },
      { method: 'POST', path: '/normalize-product' },
      { method: 'POST', path: '/compare-products' },
      { method: 'POST', path: '/score-listing-quality' },
      { method: 'POST', path: '/detect-price-change' },
      { method: 'POST', path: '/monitor-product' },
      { method: 'POST', path: '/summarize-product' },
      { method: 'POST', path: '/execution-gate' },
    ],
    execution_chain: [
      'product-data/execution-gate',
      'autopilot/should-execute',
      'action-api/execute',
    ],
  });
});
app.use('/product-data', productDataRouter);

app.get('/image-gen/info', (_req, res) => {
  res.json({
    name: 'Image Generation & Intelligence API',
    slug: 'image-gen',
    version: 'v2',
    status: 'agent',
    loop_type: 'describe_enhance_generate_score_gate',
    monetization_grade: 'A',
    category: 'ai-ml',
    description: 'DALL-E 3 image generation with prompt engineering, batch support, GPT-4o vision scoring, and agentic execution gates.',
    baseUrl: 'https://orbis-apis.onrender.com/image-gen',
    websiteUrl: 'https://orbis-apis.onrender.com',
    pricing: {
      agent_pay_per_call: {
        '/generate':        0.04,
        '/generate-batch':  0.04,
        '/describe-prompt': 0.001,
        '/score-image':     0.002,
        '/execution-gate':  0.041,
      },
    },
    endpoints: [
      { method: 'POST', path: '/generate' },
      { method: 'POST', path: '/generate-batch' },
      { method: 'POST', path: '/describe-prompt' },
      { method: 'POST', path: '/score-image' },
      { method: 'POST', path: '/execution-gate' },
    ],
    execution_chain: [
      'image-gen/execution-gate',
      'image-gen/score-image',
      'autopilot/should-execute',
    ],
  });
});
import imageGenRouter from './routes/image-gen/router';
import textGenRouter from './routes/text-gen/router';
import geocodingRouter from './routes/geocoding/router';
import webScraperRouter from './routes/web-scraper/router';
app.use('/image-gen', imageGenInfoRouter);
app.use('/image-gen', imageGenRouter);
app.use('/text-gen', textGenInfoRouter);
app.use('/text-gen', textGenRouter);
app.use('/geocoding', geocodingInfoRouter);
app.use('/geocoding', geocodingRouter);
app.get('/web-scraper/info', (_req, res) => {
  res.json({
    name: 'Web Scraper & Intelligence API',
    slug: 'web-scraper',
    version: 'v2',
    status: 'agent',
    loop_type: 'scrape_extract_summarize_detect_monitor_gate',
    monetization_grade: 'A',
    category: 'data-analytics',
    description: 'Agent-native web scraping, structured extraction, change detection, source monitoring, and execution gating via Tavily.',
    baseUrl: 'https://orbis-apis.onrender.com/web-scraper',
    websiteUrl: 'https://orbis-apis.onrender.com',
    pricing: {
      agent_pay_per_call: {
        '/scrape': 0.005,
        '/scrape-batch': 0.005,
        '/search': 0.005,
        '/extract-structured': 0.006,
        '/summarize': 0.002,
        '/detect-change': 0.007,
        '/monitor-source': 0.001,
        '/execution-gate': 0.003,
      },
    },
    endpoints: [
      { method: 'POST', path: '/scrape' },
      { method: 'POST', path: '/scrape-batch' },
      { method: 'POST', path: '/search' },
      { method: 'POST', path: '/extract-structured' },
      { method: 'POST', path: '/summarize' },
      { method: 'POST', path: '/detect-change' },
      { method: 'POST', path: '/monitor-source' },
      { method: 'POST', path: '/execution-gate' },
    ],
    execution_chain: [
      'web-scraper/scrape',
      'web-scraper/detect-change',
      'web-scraper/execution-gate',
      'autopilot/should-execute',
    ],
  });
});
app.use('/web-scraper', webScraperInfoRouter);
app.use('/web-scraper', webScraperRouter);

app.get("/info", (_req, res) => {
  res.json({
    service: "orbis-apis",
    version: "v2",
    description: "Agent-native API suite for DeFi, crypto, AI, web intelligence, and autonomous agent workflows",
    baseUrl: "https://orbis-apis.onrender.com",
    discovery: "Each API has its own /info endpoint and /openapi.json for x402 agent discovery",
    total_apis: 72,
    apis: [
      { "slug": "action", "path": "/action", "info": "/action", "openapi": "/action/openapi.json" },
      { "slug": "agent-identity", "path": "/agent-identity", "info": "/agent-identity", "openapi": "/agent-identity/openapi.json" },
      { "slug": "agent-memory", "path": "/agent-memory", "info": "/agent-memory", "openapi": "/agent-memory/openapi.json" },
      { "slug": "agent-skills", "path": "/agent-skills", "info": "/agent-skills", "openapi": "/agent-skills/openapi.json" },
      { "slug": "agent-workflow", "path": "/agent-workflow", "info": "/agent-workflow", "openapi": "/agent-workflow/openapi.json" },
      { "slug": "ai-output-safety", "path": "/ai-output-safety", "info": "/ai-output-safety", "openapi": "/ai-output-safety/openapi.json" },
      { "slug": "alpha-signal", "path": "/alpha-signal", "info": "/alpha-signal", "openapi": "/alpha-signal/openapi.json" },
      { "slug": "autopilot", "path": "/autopilot", "info": "/autopilot", "openapi": "/autopilot/openapi.json" },
      { "slug": "browser-task", "path": "/browser-task", "info": "/browser-task", "openapi": "/browser-task/openapi.json" },
      { "slug": "company-research", "path": "/company-research", "info": "/company-research", "openapi": "/company-research/openapi.json" },
      { "slug": "contract-analyzer", "path": "/contract-analyzer", "info": "/contract-analyzer", "openapi": "/contract-analyzer/openapi.json" },
      { "slug": "cross-chain-bridge", "path": "/cross-chain-bridge", "info": "/cross-chain-bridge", "openapi": "/cross-chain-bridge/openapi.json" },
      { "slug": "crypto-alerts", "path": "/crypto-alerts", "info": "/crypto-alerts", "openapi": "/crypto-alerts/openapi.json" },
      { "slug": "crypto-narrative", "path": "/crypto-narrative", "info": "/crypto-narrative", "openapi": "/crypto-narrative/openapi.json" },
      { "slug": "crypto-news-impact", "path": "/crypto-news-impact", "info": "/crypto-news-impact", "openapi": "/crypto-news-impact/openapi.json" },
      { "slug": "decision-scorer", "path": "/decision-scorer", "info": "/decision-scorer", "openapi": "/decision-scorer/openapi.json" },
      { "slug": "defi-position-monitor", "path": "/defi-position-monitor", "info": "/defi-position-monitor", "openapi": "/defi-position-monitor/openapi.json" },
      { "slug": "defi-risk", "path": "/defi-risk", "info": "/defi-risk", "openapi": "/defi-risk/openapi.json" },
      { "slug": "derivatives", "path": "/derivatives", "info": "/derivatives", "openapi": "/derivatives/openapi.json" },
      { "slug": "derivatives-intelligence", "path": "/derivatives-intelligence", "info": "/derivatives-intelligence", "openapi": "/derivatives-intelligence/openapi.json" },
      { "slug": "dev-utilities", "path": "/dev-utilities", "info": "/dev-utilities", "openapi": "/dev-utilities/openapi.json" },
      { "slug": "document-intelligence", "path": "/document-intelligence", "info": "/document-intelligence", "openapi": "/document-intelligence/openapi.json" },
      { "slug": "email-validation", "path": "/email-validation", "info": "/email-validation", "openapi": "/email-validation/openapi.json" },
      { "slug": "ens-resolver", "path": "/ens-resolver", "info": "/ens-resolver", "openapi": "/ens-resolver/openapi.json" },
      { "slug": "extraction", "path": "/extraction", "info": "/extraction", "openapi": "/extraction/openapi.json" },
      { "slug": "funding-rate", "path": "/funding-rate", "info": "/funding-rate", "openapi": "/funding-rate/openapi.json" },
      { "slug": "gas-optimizer", "path": "/gas-optimizer", "info": "/gas-optimizer", "openapi": "/gas-optimizer/openapi.json" },
      { "slug": "identity-intelligence", "path": "/identity-intelligence", "info": "/identity-intelligence", "openapi": "/identity-intelligence/openapi.json" },
      { "slug": "image-gen", "path": "/image-gen", "info": "/image-gen", "openapi": "/image-gen/openapi.json" },
      { "slug": "image-to-content", "path": "/image-to-content", "info": "/image-to-content", "openapi": "/image-to-content/openapi.json" },
      { "slug": "ip-intelligence", "path": "/ip-intelligence", "info": "/ip-intelligence", "openapi": "/ip-intelligence/openapi.json" },
      { "slug": "lead-discovery", "path": "/lead-discovery", "info": "/lead-discovery", "openapi": "/lead-discovery/openapi.json" },
      { "slug": "lead-enrichment", "path": "/lead-enrichment", "info": "/lead-enrichment", "openapi": "/lead-enrichment/openapi.json" },
      { "slug": "lead-quality", "path": "/lead-quality", "info": "/lead-quality", "openapi": "/lead-quality/openapi.json" },
      { "slug": "liquidation-feed", "path": "/liquidation-feed", "info": "/liquidation-feed", "openapi": "/liquidation-feed/openapi.json" },
      { "slug": "market-correlation", "path": "/market-correlation", "info": "/market-correlation", "openapi": "/market-correlation/openapi.json" },
      { "slug": "market-intelligence", "path": "/market-intelligence", "info": "/market-intelligence", "openapi": "/market-intelligence/openapi.json" },
      { "slug": "market-signal", "path": "/market-signal", "info": "/market-signal", "openapi": "/market-signal/openapi.json" },
      { "slug": "market-stress", "path": "/market-stress", "info": "/market-stress", "openapi": "/market-stress/openapi.json" },
      { "slug": "market-trigger", "path": "/market-trigger", "info": "/market-trigger", "openapi": "/market-trigger/openapi.json" },
      { "slug": "market-webhook", "path": "/market-webhook", "info": "/market-webhook", "openapi": "/market-webhook/openapi.json" },
      { "slug": "meta-strategy", "path": "/meta-strategy", "info": "/meta-strategy", "openapi": "/meta-strategy/openapi.json" },
      { "slug": "nft-metadata", "path": "/nft-metadata", "info": "/nft-metadata", "openapi": "/nft-metadata/openapi.json" },
      { "slug": "onchain-news", "path": "/onchain-news", "info": "/onchain-news", "openapi": "/onchain-news/openapi.json" },
      { "slug": "onchain-signal", "path": "/onchain-signal", "info": "/onchain-signal", "openapi": "/onchain-signal/openapi.json" },
      { "slug": "phone-validation", "path": "/phone-validation", "info": "/phone-validation", "openapi": "/phone-validation/openapi.json" },
      { "slug": "portfolio-rebalance", "path": "/portfolio-rebalance", "info": "/portfolio-rebalance", "openapi": "/portfolio-rebalance/openapi.json" },
      { "slug": "prediction-market", "path": "/prediction-market", "info": "/prediction-market", "openapi": "/prediction-market/openapi.json" },
      { "slug": "product-data", "path": "/product-data", "info": "/product-data", "openapi": "/product-data/openapi.json" },
      { "slug": "search-extract", "path": "/search-extract", "info": "/search-extract", "openapi": "/search-extract/openapi.json" },
      { "slug": "social-sentiment", "path": "/social-sentiment", "info": "/social-sentiment", "openapi": "/social-sentiment/openapi.json" },
      { "slug": "stablecoin-yield", "path": "/stablecoin-yield", "info": "/stablecoin-yield", "openapi": "/stablecoin-yield/openapi.json" },
      { "slug": "strategy-execution", "path": "/strategy-execution", "info": "/strategy-execution", "openapi": "/strategy-execution/openapi.json" },
      { "slug": "strategy-signal", "path": "/strategy-signal", "info": "/strategy-signal", "openapi": "/strategy-signal/openapi.json" },
      { "slug": "text-extractor", "path": "/text-extractor", "info": "/text-extractor", "openapi": "/text-extractor/openapi.json" },
      { "slug": "token-price-feed", "path": "/token-price-feed", "info": "/token-price-feed", "openapi": "/token-price-feed/openapi.json" },
      { "slug": "token-screener", "path": "/token-screener", "info": "/token-screener", "openapi": "/token-screener/openapi.json" },
      { "slug": "token-trust", "path": "/token-trust", "info": "/token-trust", "openapi": "/token-trust/openapi.json" },
      { "slug": "token-unlock", "path": "/token-unlock", "info": "/token-unlock", "openapi": "/token-unlock/openapi.json" },
      { "slug": "tokenomics", "path": "/tokenomics", "info": "/tokenomics", "openapi": "/tokenomics/openapi.json" },
      { "slug": "trust", "path": "/trust", "info": "/trust", "openapi": "/trust/openapi.json" },
      { "slug": "tx-simulator", "path": "/tx-simulator", "info": "/tx-simulator", "openapi": "/tx-simulator/openapi.json" },
      { "slug": "unified-decision", "path": "/unified-decision", "info": "/unified-decision", "openapi": "/unified-decision/openapi.json" },
      { "slug": "user-risk", "path": "/user-risk", "info": "/user-risk", "openapi": "/user-risk/openapi.json" },
      { "slug": "wallet", "path": "/wallet", "info": "/wallet", "openapi": "/wallet/openapi.json" },
      { "slug": "wallet-intelligence", "path": "/wallet-intelligence", "info": "/wallet-intelligence", "openapi": "/wallet-intelligence/openapi.json" },
      { "slug": "wallet-portfolio", "path": "/wallet-portfolio", "info": "/wallet-portfolio", "openapi": "/wallet-portfolio/openapi.json" },
      { "slug": "wallet-reputation", "path": "/wallet-reputation", "info": "/wallet-reputation", "openapi": "/wallet-reputation/openapi.json" },
      { "slug": "web-researcher", "path": "/web-researcher", "info": "/web-researcher", "openapi": "/web-researcher/openapi.json" },
      { "slug": "web-scraper", "path": "/web-scraper", "info": "/web-scraper", "openapi": "/web-scraper/openapi.json" },
      { "slug": "website-monitor", "path": "/website-monitor", "info": "/website-monitor", "openapi": "/website-monitor/openapi.json" },
      { "slug": "yield-farming", "path": "/yield-farming", "info": "/yield-farming", "openapi": "/yield-farming/openapi.json" }
    ],
    execution_ready: true
  });
});

app.get('/market-signal-v2/info', (_req, res) => {
  res.json({
    name: 'Agent Market Signal & Portfolio Intelligence API',
    slug: 'market-signal-v2',
    version: 'v2',
    status: 'agent',
    loop_type: 'quote_score_detect_rank_risk_monitor_stream_gate_act',
    monetization_grade: 'A+',
    category: 'ai-ml',
    description: 'Real-time stock market intelligence for autonomous agents. Score tickers, detect market events, rank watchlists, analyze portfolio risk, monitor positions, stream live prices, and gate autonomous trading actions.',
    baseUrl: 'https://orbis-apis.onrender.com/market-signal-v2',
    websiteUrl: 'https://orbis-apis.onrender.com',
    openapi: 'https://orbis-apis.onrender.com/market-signal-v2/openapi.json',
    pricing: {
      '/score-ticker': 0.004,
      '/detect-market-event': 0.004,
      '/rank-watchlist': 0.005,
      '/portfolio-risk': 0.006,
      '/monitor-watchlist': 0.004,
      '/execution-gate': 0.005,
      '/register-webhook': 0.002,
      '/stream': 0.003,
      '/monitor-status': 0.001,
      '/monitor-cancel': 0.001,
    },
    endpoints: [
      { method: 'POST', path: '/score-ticker', description: 'Score a ticker for signal strength, momentum, volatility and recommended action.' },
      { method: 'POST', path: '/detect-market-event', description: 'Detect market events: gap up/down, volume spike, breakout, breakdown, reversal.' },
      { method: 'POST', path: '/rank-watchlist', description: 'Rank watchlist tickers by signal strength. Returns top pick and avoid.' },
      { method: 'POST', path: '/portfolio-risk', description: 'Analyze portfolio risk, concentration, PnL, and recommended actions.' },
      { method: 'POST', path: '/monitor-watchlist', description: 'Monitor watchlist for price alerts and surface movers.' },
      { method: 'POST', path: '/execution-gate', description: 'Gate autonomous trading actions. Returns execute bool, blocking flags, next API.' },
      { method: 'POST', path: '/register-webhook', description: 'Register webhook for price alerts when tickers move beyond threshold.' },
      { method: 'GET',  path: '/stream', description: 'SSE stream — real-time price pulses and webhook firing on big moves.' },
      { method: 'POST', path: '/monitor-status', description: 'Check status of a registered monitor.' },
      { method: 'POST', path: '/monitor-cancel', description: 'Cancel an active monitor.' },
    ],
    execution_chain: [
      'market-signal-v2/score-ticker',
      'market-signal-v2/detect-market-event',
      'market-signal-v2/execution-gate',
      'autopilot/should-execute',
      'action-api/execute',
    ],
  });
});
app.use('/youtube-intelligence/openapi.json', youtubeIntelligenceOpenapiRouter);
app.use('/youtube-intelligence', youtubeIntelligenceRouter);
app.get('/youtube-intelligence/info', (_req, res) => res.json({
  name: 'Agent YouTube Intelligence API',
  slug: 'youtube-intelligence',
  version: 'v1',
  status: 'agent',
  loop_type: 'fetch_summarize_extract_score_gate_act',
  monetization_grade: 'A+',
  category: 'ai-ml',
  description: 'YouTube video summarization, entity extraction, channel analysis, action item extraction, content scoring, safety metadata, and execution-gated workflows for autonomous agents.',
  baseUrl: 'https://orbis-apis.onrender.com/youtube-intelligence',
  websiteUrl: 'https://orbis-apis.onrender.com',
  openapi: 'https://orbis-apis.onrender.com/youtube-intelligence/openapi.json',
  uptime: '99.9%',
  avg_latency_ms: 5000,
  mcp_compatible: true,
  rate_limits: { free: '100 req/day', builder: '50000 req/day', execution: '250000 req/day' },
  pricing: {
    '/summarize': 0.004,
    '/extract-entities': 0.004,
    '/analyze-channel': 0.005,
    '/extract-action-items': 0.004,
    '/score-content': 0.003,
    '/execution-gate': 0.004,
    '/analyze-video': 0.008,
  },
  endpoints: [
    { method: 'POST', path: '/summarize', description: 'Summarize a YouTube video. Returns topics, audience, content type, action items.', agent_use_case: 'Research agents summarizing video content into CRM notes' },
    { method: 'POST', path: '/extract-entities', description: 'Extract people, companies, products, technologies from video.', agent_use_case: 'Content agents building knowledge graphs' },
    { method: 'POST', path: '/analyze-channel', description: 'Analyze a YouTube channel — niche, authority, content strategy.', agent_use_case: 'Sales agents evaluating channel authority before outreach' },
    { method: 'POST', path: '/extract-action-items', description: 'Extract action items, takeaways, tools, and CRM notes.', agent_use_case: 'Sales agents converting video content into CRM actions' },
    { method: 'POST', path: '/score-content', description: 'Score video content quality, credibility, and research value.', agent_use_case: 'QA agents scoring content before ingestion' },
    { method: 'POST', path: '/execution-gate', description: 'Gate autonomous content processing. Returns execute bool, blocking flags, safety metadata.', agent_use_case: 'Autonomous pipelines gating video ingestion' },
    { method: 'POST', path: '/analyze-video', description: 'ONE-CALL: Full video intelligence — summarize + entities + score + action items + safety + gate.', agent_use_case: 'Any agent needing complete video intelligence in one request' },
  ],
  execution_chain: [
    'youtube-intelligence/analyze-video',
    'youtube-intelligence/execution-gate',
    'autopilot/should-execute',
    'action-api/execute',
  ],
}))

// ── PDF Extraction ──────────────────────────────────────────────────────────────
app.use('/pdf-extraction/openapi.json', pdfExtractionOpenapiRouter);
app.use('/pdf-extraction', pdfExtractionRouter);
app.get('/pdf-extraction/info', (_req, res) => res.json({
  name: 'Agent PDF Extraction API',
  slug: 'pdf-extraction',
  version: 'v1',
  status: 'agent',
  loop_type: 'classify_extract_validate_gate_act',
  monetization_grade: 'A+',
  category: 'ai-ml',
  mcp_compatible: true,
  description: 'PDF to structured JSON extraction for invoices, contracts, receipts, resumes and custom documents. Built for autonomous document processing agents, accounting automation, legal intelligence, and CRM enrichment workflows.',
  baseUrl: 'https://orbis-apis.onrender.com/pdf-extraction',
  websiteUrl: 'https://orbis-apis.onrender.com',
  openapi: 'https://orbis-apis.onrender.com/pdf-extraction/openapi.json',
  pricing: {
    '/extract-invoice': 0.005,
    '/extract-contract': 0.006,
    '/extract-receipt': 0.003,
    '/extract-resume': 0.004,
    '/extract-custom': 0.005,
    '/classify-document': 0.002,
    '/execution-gate': 0.004,
    '/analyze-document': 0.008,
  },
  endpoints: [
    { method: 'POST', path: '/extract-invoice', description: 'Extract invoice data: vendor, client, line items, totals, payment terms.' },
    { method: 'POST', path: '/extract-contract', description: 'Extract contract key terms: parties, dates, obligations, risk flags.' },
    { method: 'POST', path: '/extract-receipt', description: 'Extract receipt data: merchant, items, totals, payment method, category.' },
    { method: 'POST', path: '/extract-resume', description: 'Extract resume: experience, skills, education, seniority level.' },
    { method: 'POST', path: '/extract-custom', description: 'Extract any fields using a custom schema definition.' },
    { method: 'POST', path: '/classify-document', description: 'Classify document type and recommend the right extractor.' },
    { method: 'POST', path: '/execution-gate', description: 'Gate autonomous document processing. Returns execute bool, PII detection, data quality, next API.' },
    { method: 'POST', path: '/analyze-document', description: 'ONE-CALL: Full document intelligence — classify + extract + gate in one request.', agent_use_case: 'Any agent needing complete document intelligence in one API call' },
  ],
  execution_chain: [
    'pdf-extraction/classify-document',
    'pdf-extraction/extract-invoice',
    'pdf-extraction/execution-gate',
    'autopilot/should-execute',
    'action-api/execute',
  ],
}));


// ── PDF Extraction ──────────────────────────────────────────────────────────────
app.use('/pdf-extraction', pdfExtractionRouter);
app.get('/pdf-extraction/info', (_req, res) => res.json({
  name: 'Agent PDF Extraction API',
  slug: 'pdf-extraction',
  version: 'v1',
  status: 'agent',
  loop_type: 'classify_extract_validate_gate_act',
  monetization_grade: 'A+',
  category: 'ai-ml',
  mcp_compatible: true,
  description: 'PDF to structured JSON extraction for invoices, contracts, receipts, resumes and custom documents. Built for autonomous document processing agents, accounting automation, legal intelligence, and CRM enrichment workflows.',
  baseUrl: 'https://orbis-apis.onrender.com/pdf-extraction',
  websiteUrl: 'https://orbis-apis.onrender.com',
  openapi: 'https://orbis-apis.onrender.com/pdf-extraction/openapi.json',
  pricing: {
    '/extract-invoice': 0.005,
    '/extract-contract': 0.006,
    '/extract-receipt': 0.003,
    '/extract-resume': 0.004,
    '/extract-custom': 0.005,
    '/classify-document': 0.002,
    '/execution-gate': 0.004,
  },
  endpoints: [
    { method: 'POST', path: '/extract-invoice', description: 'Extract invoice data: vendor, client, line items, totals, payment terms.' },
    { method: 'POST', path: '/extract-contract', description: 'Extract contract key terms: parties, dates, obligations, risk flags.' },
    { method: 'POST', path: '/extract-receipt', description: 'Extract receipt data: merchant, items, totals, payment method, category.' },
    { method: 'POST', path: '/extract-resume', description: 'Extract resume: experience, skills, education, seniority level.' },
    { method: 'POST', path: '/extract-custom', description: 'Extract any fields using a custom schema definition.' },
    { method: 'POST', path: '/classify-document', description: 'Classify document type and recommend the right extractor.' },
    { method: 'POST', path: '/execution-gate', description: 'Gate autonomous document processing. Returns execute bool, PII detection, data quality, next API.' },
    { method: 'POST', path: '/analyze-document', description: 'ONE-CALL: Full document intelligence — classify + extract + gate in one request.', agent_use_case: 'Any agent needing complete document intelligence in one API call' },
  ],
  execution_chain: [
    'pdf-extraction/classify-document',
    'pdf-extraction/extract-invoice',
    'pdf-extraction/execution-gate',
    'autopilot/should-execute',
    'action-api/execute',
  ],
}));


// ── email-intelligence ──────────────────────────────────────────────────────────────
app.use('/email-intelligence/openapi.json', emailIntelligenceOpenapiRouter);
app.use('/email-intelligence', emailIntelligenceRouter);
app.get('/email-intelligence/info', (_req, res) => res.json({
  name: 'Agent Email Intelligence API',
  slug: 'email-intelligence',
  version: 'v1',
  status: 'agent',
  loop_type: 'verify_score_enrich_domain_batch_gate_act',
  monetization_grade: 'A+',
  mcp_compatible: true,
  category: 'ai-ml',
  description: 'Email verification, risk scoring, enrichment, domain health, batch processing, and execution-gated contact workflows for autonomous agents.',
  baseUrl: 'https://orbis-apis.onrender.com/email-intelligence',
  websiteUrl: 'https://orbis-apis.onrender.com',
  openapi: 'https://orbis-apis.onrender.com/email-intelligence/openapi.json',
  uptime: '99.9%',
  avg_latency_ms: 1500,
  rate_limits: { free: '100 req/day', builder: '50000 req/day', execution: '250000 req/day' },
  privacy: {
    emails_stored: false,
    data_retention: 'none',
    enrichment_logs_retained: false,
    pii_redacted: true,
    note: 'Emails are processed in-memory only. No email addresses or enrichment data are stored or logged.',
  },
  pricing: {
    '/verify': 0.001,
    '/risk-score': 0.003,
    '/enrich': 0.004,
    '/domain-health': 0.002,
    '/batch-verify': { per_call: 0.004, note: 'flat rate per batch call regardless of batch size (max 50 emails)' },
    '/execution-gate': 0.002,
    '/analyze-email': 0.006,
  },
  high_volume_pricing: {
    '/verify': 0.0005,
    '/risk-score': 0.0015,
    '/enrich': 0.002,
    '/domain-health': 0.001,
    '/batch-verify': 0.002,
    '/execution-gate': 0.001,
    '/analyze-email': 0.003,
  },
  endpoints: [
    { method: 'POST', path: '/verify', description: 'Verify email format, deliverability, disposable detection, domain reputation.' },
    { method: 'POST', path: '/risk-score', description: 'Score email for fraud risk, spam likelihood, and get allow/block recommendation.' },
    { method: 'POST', path: '/enrich', description: 'Enrich email with company, industry, seniority, and LinkedIn search query.' },
    { method: 'POST', path: '/domain-health', description: 'Heuristic domain health check — estimates MX/SPF/DMARC likelihood based on domain reachability and patterns. Does not perform live DNS lookups.' },
    { method: 'POST', path: '/batch-verify', description: 'Batch verify up to 50 emails. Priced at $0.004 per batch call (flat rate, not per email).', pricing_note: '$0.004 per batch call regardless of size' },
    { method: 'POST', path: '/execution-gate', description: 'Gate autonomous email workflows. Returns execute bool, blocking flags, next API.' },
    { method: 'POST', path: '/analyze-email', description: 'ONE-CALL: Full email intelligence — verify + risk + enrich + gate in one request.', x_one_call: true },
  ],
  execution_chain: [
    'email-intelligence/verify',
    'email-intelligence/risk-score',
    'email-intelligence/execution-gate',
    'autopilot/should-execute',
    'action-api/send-email',
  ],
}));


// ── serp-intelligence ────────────────────────────────────────────────────────
app.use('/serp-intelligence/openapi.json', serpIntelligenceOpenapiRouter);
app.use('/serp-intelligence', serpIntelligenceRouter);
app.get('/serp-intelligence/info', (_req, res) => res.json({
  name: 'SERP Intelligence API',
  slug: 'serp-intelligence',
  version: '1.0.0',
  grade: 'A+',
  mcp_compatible: true,
  privacy: { data_stored: false, retention: 'none', pii_note: 'Search data processed in-memory only, never persisted' },
  pricing: {
    free_tier: { requests_per_day: 100, requests_per_month: 3000 },
    pay_per_call: { analyze_serp: '$0.005', keyword_intelligence: '$0.005', ranking_signals: '$0.006', competitor_gap: '$0.007', content_opportunities: '$0.006', featured_snippet: '$0.005', local_pack_signals: '$0.005', search_intent: '$0.004', execution_gate: '$0.002', analyze_search_visibility: '$0.015' },
    high_volume: { analyze_serp: '$0.003', competitor_gap: '$0.005', analyze_search_visibility: '$0.009' },
  },
  rate_limits: { free: '100/day', paid: '50000/day', enterprise: '500000/day' },
  endpoints: [
    { method: 'POST', path: '/analyze-serp', description: 'Full SERP analysis with difficulty, intent, content type distribution and ranking opportunity score' },
    { method: 'POST', path: '/keyword-intelligence', description: 'Keyword difficulty, volume, CPC, intent classification and long-tail opportunities' },
    { method: 'POST', path: '/ranking-signals', description: 'On-page, off-page and technical ranking signals with prioritized actions' },
    { method: 'POST', path: '/competitor-gap', description: 'Keyword and content gap analysis vs competitors with quick wins' },
    { method: 'POST', path: '/content-opportunities', description: 'Content cluster map, SERP feature targets and editorial calendar suggestions' },
    { method: 'POST', path: '/featured-snippet', description: 'Featured snippet eligibility score, optimization requirements and sample content' },
    { method: 'POST', path: '/local-pack-signals', description: 'Local pack ranking factors, GMB optimization tips and review strategy' },
    { method: 'POST', path: '/search-intent', description: 'Deep intent classification with user journey stage, content alignment and conversion potential' },
    { method: 'POST', path: '/execution-gate', description: 'Execution readiness, blocking flags, next API chaining' },
    { method: 'POST', path: '/analyze-search-visibility', description: 'ONE-CALL: full visibility workflow — SERP, keyword intel, ranking signals, gaps, opportunities and execution plan', x_one_call: true },
  ],
  execution_chain: { previous: 'local-business', next: 'shopify-analyzer', optional_next: ['competitor-monitor', 'content-optimizer'] },
}));

// ── local-business ────────────────────────────────────────────────────────────
app.use('/local-business/openapi.json', localBusinessOpenapiRouter);
app.use('/local-business', localBusinessRouter);
app.get('/local-business/info', (_req, res) => res.json({
  name: 'Local Business API',
  slug: 'local-business',
  version: '1.0.0',
  grade: 'A+',
  mcp_compatible: true,
  privacy: { data_stored: false, retention: 'none', pii_note: 'Business data processed in-memory only, never persisted' },
  pricing: {
    free_tier: { requests_per_day: 100, requests_per_month: 3000 },
    pay_per_call: { analyze_business: '$0.006', reputation_analysis: '$0.005', foot_traffic_signals: '$0.005', local_competitors: '$0.006', market_opportunity: '$0.007', customer_profile: '$0.006', location_score: '$0.005', execution_gate: '$0.002', analyze_local_business: '$0.015' },
    high_volume: { analyze_business: '$0.004', market_opportunity: '$0.005', analyze_local_business: '$0.009' },
  },
  rate_limits: { free: '100/day', paid: '50000/day', enterprise: '500000/day' },
  endpoints: [
    { method: 'POST', path: '/analyze-business', description: 'Full SWOT analysis with market position, demographics and foot traffic estimate' },
    { method: 'POST', path: '/reputation-analysis', description: 'Reputation score, sentiment breakdown, trust signals and response templates' },
    { method: 'POST', path: '/foot-traffic-signals', description: 'Traffic score, daily visitor estimates, peak times and catchment area profile' },
    { method: 'POST', path: '/local-competitors', description: 'Local competitive density, competitor profiles and differentiation opportunities' },
    { method: 'POST', path: '/market-opportunity', description: 'Opportunity score, market size, demand signals and ROI projections' },
    { method: 'POST', path: '/customer-profile', description: 'Customer personas, LTV estimate, acquisition channels and retention drivers' },
    { method: 'POST', path: '/location-score', description: 'Score location across 7 dimensions with grade and lease negotiation tips' },
    { method: 'POST', path: '/execution-gate', description: 'Execution readiness, blocking flags, next API chaining' },
    { method: 'POST', path: '/analyze-local-business', description: 'ONE-CALL: full local business workflow — score, reputation, foot traffic, competitors, persona, location grade', x_one_call: true },
  ],
  execution_chain: { previous: 'competitor-monitor', next: 'serp-intelligence', optional_next: ['market-signal-v2', 'cold-outreach'] },
}));

// ── competitor-monitor ────────────────────────────────────────────────────────
app.use('/competitor-monitor/openapi.json', competitorMonitorOpenapiRouter);
app.use('/competitor-monitor', competitorMonitorRouter);
app.get('/competitor-monitor/info', (_req, res) => res.json({
  name: 'Competitor Monitor API',
  slug: 'competitor-monitor',
  version: '1.0.0',
  grade: 'A+',
  mcp_compatible: true,
  privacy: { data_stored: false, retention: 'none', pii_note: 'Competitive data processed in-memory only, never persisted' },
  pricing: {
    free_tier: { requests_per_day: 100, requests_per_month: 3000 },
    pay_per_call: { analyze_competitor: '$0.006', compare_features: '$0.005', pricing_intelligence: '$0.005', detect_threats: '$0.006', positioning_map: '$0.007', battlecard: '$0.008', monitor_changes: '$0.005', win_loss_analysis: '$0.006', execution_gate: '$0.002', analyze_competitive_landscape: '$0.015' },
    high_volume: { analyze_competitor: '$0.004', battlecard: '$0.005', analyze_competitive_landscape: '$0.009' },
  },
  rate_limits: { free: '100/day', paid: '50000/day', enterprise: '500000/day' },
  endpoints: [
    { method: 'POST', path: '/analyze-competitor', description: 'Full competitor analysis with threat level, strengths, weaknesses and strategic direction' },
    { method: 'POST', path: '/compare-features', description: 'Side-by-side feature comparison matrix with gap analysis' },
    { method: 'POST', path: '/pricing-intelligence', description: 'Competitive pricing analysis and positioning recommendations' },
    { method: 'POST', path: '/detect-threats', description: 'Detect and rank competitive threats with defensive priorities' },
    { method: 'POST', path: '/positioning-map', description: 'Competitive positioning map with white space opportunities' },
    { method: 'POST', path: '/battlecard', description: 'Sales battlecard with trap questions, talk tracks and win themes' },
    { method: 'POST', path: '/monitor-changes', description: 'Detect competitor changes and interpret strategic shifts' },
    { method: 'POST', path: '/win-loss-analysis', description: 'Analyze win-loss patterns with improvement opportunities' },
    { method: 'POST', path: '/execution-gate', description: 'Execution readiness, blocking flags, next API chaining' },
    { method: 'POST', path: '/analyze-competitive-landscape', description: 'ONE-CALL: full landscape — market overview, threat matrix, positioning, opportunity map, recommendations', x_one_call: true },
  ],
  execution_chain: { previous: 'cold-outreach', next: 'local-business', optional_next: ['market-signal-v2', 'serp-intelligence'] },
}));

// ── cold-outreach ──────────────────────────────────────────────────────────────
app.use('/cold-outreach/openapi.json', coldOutreachApiOpenapiRouter);
app.use('/cold-outreach', coldOutreachApiRouter);
app.get('/cold-outreach/info', (_req, res) => res.json({
  name: 'Cold Outreach API',
  slug: 'cold-outreach',
  version: '1.0.0',
  grade: 'A+',
  mcp_compatible: true,
  privacy: { data_stored: false, retention: 'none', pii_note: 'Email content processed in-memory only, never persisted' },
  pricing: {
    free_tier: { requests_per_day: 100, requests_per_month: 3000 },
    pay_per_call: { generate_sequence: '$0.008', personalize_email: '$0.005', optimize_subject: '$0.004', analyze_reply: '$0.004', generate_followup: '$0.005', score_email: '$0.003', ab_test: '$0.005', objection_handler: '$0.005', timing_optimizer: '$0.003', execution_gate: '$0.002', analyze_outreach: '$0.015' },
    high_volume: { generate_sequence: '$0.005', analyze_outreach: '$0.009' },
  },
  rate_limits: { free: '100/day', paid: '50000/day', enterprise: '500000/day' },
  endpoints: [
    { method: 'POST', path: '/generate-sequence', description: 'Generate a full multi-step cold outreach sequence' },
    { method: 'POST', path: '/personalize-email', description: 'Deep-personalize an email template for a prospect' },
    { method: 'POST', path: '/optimize-subject', description: 'Generate 5 optimized subject line variants with open rate predictions' },
    { method: 'POST', path: '/analyze-reply', description: 'Analyze prospect reply for sentiment, intent and next action' },
    { method: 'POST', path: '/generate-followup', description: 'Generate a contextual follow-up email' },
    { method: 'POST', path: '/score-email', description: 'Score a cold email 0-100 across 6 dimensions' },
    { method: 'POST', path: '/ab-test', description: 'Analyze email variants for A/B testing with winner prediction' },
    { method: 'POST', path: '/objection-handler', description: 'Generate objection handling responses with 3 script variants' },
    { method: 'POST', path: '/timing-optimizer', description: 'Optimize email send timing by industry and timezone' },
    { method: 'POST', path: '/execution-gate', description: 'Execution readiness, blocking flags, next API' },
    { method: 'POST', path: '/analyze-outreach', description: 'ONE-CALL: full outreach workflow — strategy + sequence + timing + scoring', x_one_call: true },
  ],
  execution_chain: { previous: 'lead-scoring', next: 'competitor-monitor', optional_next: ['email-intelligence', 'calendar-scheduling'] },
}));

// ── lead-scoring ──────────────────────────────────────────────────────────────
app.use('/lead-scoring/openapi.json', leadScoringOpenapiRouter);
app.use('/lead-scoring', leadScoringRouter);
app.get('/lead-scoring/info', (_req, res) => res.json({
  name: 'Lead Scoring API',
  slug: 'lead-scoring',
  version: '1.0.0',
  grade: 'A+',
  mcp_compatible: true,
  privacy: { data_stored: false, retention: 'none', crm_data_logged: false, pii_note: 'Lead data processed in-memory only, never persisted' },
  pricing: {
    free_tier: { requests_per_day: 100, requests_per_month: 3000 },
    pay_per_call: { score_lead: '$0.004', qualify_bant: '$0.005', icp_fit: '$0.004', intent_signals: '$0.005', priority_rank: '$0.006', disqualify: '$0.003', enrich_profile: '$0.005', conversion_predict: '$0.006', competitive_position: '$0.006', routing_decision: '$0.004', score_batch: '$0.010 flat per batch (not per lead)', execution_gate: '$0.003', analyze_lead: '$0.015' },
    high_volume: { score_lead: '$0.0025', qualify_bant: '$0.003', score_batch: '$0.006 flat per batch', analyze_lead: '$0.009' },
  },
  rate_limits: { free: '100/day', paid: '50000/day', enterprise: '500000/day' },
  endpoints: [
    { method: 'POST', path: '/score-lead', description: 'Score lead 0-100 with grade, fit dimensions, score breakdown and next steps' },
    { method: 'POST', path: '/qualify-bant', description: 'Full BANT qualification with evidence, gaps and discovery questions' },
    { method: 'POST', path: '/icp-fit', description: 'Match lead against ICP definition with persona fit analysis' },
    { method: 'POST', path: '/intent-signals', description: 'Buying stage, signal strength, urgency indicators, trigger events' },
    { method: 'POST', path: '/priority-rank', description: 'Rank and tier multiple leads for daily sales focus' },
    { method: 'POST', path: '/disqualify', description: 'Hard stops, salvage potential and recycle timeline' },
    { method: 'POST', path: '/enrich-profile', description: 'Infer firmographics, persona and conversation starters' },
    { method: 'POST', path: '/conversion-predict', description: 'Win probability, close date and forecast category' },
    { method: 'POST', path: '/competitive-position', description: 'Threat matrix, win themes and objection counters' },
    { method: 'POST', path: '/routing-decision', description: 'Assign lead to team or rep with SLA tier' },
    { method: 'POST', path: '/score-batch', description: 'Score up to 20 leads — flat price per batch call, not per lead' },
    { method: 'POST', path: '/execution-gate', description: 'Execution readiness, blocking flags, next API and optional next APIs' },
    { method: 'POST', path: '/analyze-lead', description: 'ONE-CALL: full workflow — score + BANT + ICP + intent + competitive + conversion + routing', x_one_call: true },
  ],
  execution_chain: { previous: 'market-signal-v2', next: 'cold-outreach', optional_next: ['email-intelligence', 'crm-update', 'calendar-scheduling'] },
}));




