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
app.use('/alpha-signal', alphaSignalRouter);

// ── Action API ────────────────────────────────────────────────────────────────
import actionRouter from './routes/action-api/routes/action';
app.use('/action', actionRouter);

// ── Agent Memory ──────────────────────────────────────────────────────────────
import memoryRouter from './routes/agent-memory-api/routes/memory';
import sessionsRouter from './routes/agent-memory-api/routes/sessions';
app.use('/agent-memory', memoryRouter);
app.use('/agent-memory', sessionsRouter);

// ── Agent Workflow ────────────────────────────────────────────────────────────
import workflowRouter from './routes/agent-workflow-api/routes/workflow';
app.use('/agent-workflow', workflowRouter);

// ── AI Output Safety ──────────────────────────────────────────────────────────
import { safetyRouter } from './routes/ai-output-safety-api/routes/safety.route';
app.use('/ai-output-safety', safetyRouter);

// ── Autopilot ─────────────────────────────────────────────────────────────────
import autopilotRouter from './routes/autopilot-api/routes/autopilot';
app.use('/autopilot', autopilotRouter);

// ── Browser Task ──────────────────────────────────────────────────────────────
import taskRouter from './routes/browser-task-api/routes/task';
app.use('/browser-task', taskRouter);

// ── Company Research ──────────────────────────────────────────────────────────
import researchRouter from './routes/company-research-api/routes/research';
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
app.use('/portfolio-rebalance', rebalanceRouter);
app.use('/portfolio-rebalance', strategiesRouter);

// ── Search Extract ────────────────────────────────────────────────────────────
import { searchRouter } from './routes/search-extract-api/routes/search.route';
app.use('/search-extract', searchRouter);

// ── Stablecoin Yield ──────────────────────────────────────────────────────────
import stablecoinRatesRouter from './routes/stablecoin-yield-api/routes/rates';
import stablecoinBestYieldRouter from './routes/stablecoin-yield-api/routes/bestYield';
import stablecoinCompareRouter from './routes/stablecoin-yield-api/routes/compare';
import stablecoinProtocolRouter from './routes/stablecoin-yield-api/routes/protocol';
app.use('/stablecoin-yield', stablecoinRatesRouter);
app.use('/stablecoin-yield', stablecoinBestYieldRouter);
app.use('/stablecoin-yield', stablecoinCompareRouter);
app.use('/stablecoin-yield', stablecoinProtocolRouter);

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
app.use('/website-monitor', monitorsRouter);

// ── Social Sentiment ─────────────────────────────────────────────────────────
import socialSentimentRouter from './routes/social-sentiment/index';
app.use('/social-sentiment', socialSentimentRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`[orbis-apis] Running on port ${PORT}`);
});

export default app;
