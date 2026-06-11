import { app as document_intelligence_app } from './routes/document-intelligence-api/app';
import { app as user_risk_app } from './routes/user-risk-api/app';
import { app as lead_quality_app } from './routes/lead-quality-api/app';
import { app as search_extract_app } from './routes/search-extract-api/app';
import { app as wallet_intelligence_app } from './routes/wallet-intelligence-api/app';
import { app as ip_intelligence_app } from './routes/ip-intelligence-api/app';
import { app as ai_output_safety_app } from './routes/ai-output-safety-api/app';
import { app as phone_validation_app } from './routes/phone-validation-api/app';
import { app as email_validation_app } from './routes/email-validation-api/app';
import { app as image_to_content_app } from './routes/image-to-content-api/app';
import { app as token_trust_app } from './routes/token-trust-api/app';
import { app as lead_enrichment_app } from './routes/lead-enrichment-api/app';
import { app as trust_app } from './routes/trust-api/app';
import { app as identity_intelligence_app } from './routes/identity-intelligence-api/app';
import { extractRouter as docIntelligenceRouter } from './routes/document-intelligence-api/routes/extract.route';
import { analyzeRouter as identityIntelligenceRouteRouter } from './routes/identity-intelligence-api/routes/analyze.route';
import { analyzeRouter as imageToContentRouteRouter } from './routes/image-to-content-api/routes/analyze.route';
import { enrichRouter as leadEnrichmentRouteRouter } from './routes/lead-enrichment-api/routes/enrich.route';
import { scoreRouter as leadQualityRouteRouter } from './routes/lead-quality-api/routes/score.route';
import agentIdentityIndexRouter from './routes/agent-identity-api/routes/index';
import agentWebDataExtractionIndexRouter from './routes/agent-web-data-extraction-api/routes/index';
import careerOptimizationIndexRouter from './routes/career-optimization-api/routes/index';
import contractAnalyzerAnalyzeRouter from './routes/contract-analyzer/routes/analyze';
import crossChainBridgeIndexRouter from './routes/cross-chain-bridge-api/routes/index';
import cryptoTriggerIndexRouter from './routes/crypto-trigger-api/routes/index';
import decisionScorerScoreRouter from './routes/decision-scorer/routes/score';
import defiPositionRiskIndexRouter from './routes/defi-position-risk-api/routes/index';
import defiRiskIndexRouter from './routes/defi-risk-api/routes/index';
import derivativesIndexRouter from './routes/derivatives-api/routes/index';
import derivativesIntelligenceIndexRouter from './routes/derivatives-intelligence-api/routes/index';
import ensResolverEnsRouter from './routes/ens-resolver/routes/ens';
import intelligenceExtractionIndexRouter from './routes/intelligence-extraction-api/routes/index';
import liquidationFeedIndexRouter from './routes/liquidation-feed-api/routes/index';
import marketCorrelationIndexRouter from './routes/market-correlation-api/routes/index';
import marketStressIndexRouter from './routes/market-stress-api/routes/index';
import { nftTokenRouter as nftMetadataIndexRouter } from './routes/nft-metadata/token';
import onchainNewsNewsRouter from './routes/onchain-news/routes/news';
import smartContractRiskIndexRouter from './routes/smart-contract-risk-api/routes/index';
import strategySignalIndexRouter from './routes/strategy-signal-api/routes/index';
import textExtractorExtractRouter from './routes/text-extractor/routes/extract';
import textGenerationIndexRouter from './routes/text-generation-api/routes/index';
import tokenPriceFeedPriceRouter from './routes/token-price-feed/routes/price';
import tokenScreenerIndexRouter from './routes/token-screener-api/routes/index';
import tokenomicsIndexRouter from './routes/tokenomics-api/routes/index';
import txSimulatorSimulateRouter from './routes/tx-simulator/routes/simulate';
import unifiedAiCompletionIndexRouter from './routes/unified-ai-completion-api/routes/index';
import walletReputationReputationRouter from './routes/wallet-reputation/routes/reputation';
import webResearcherResearchRouter from './routes/web-researcher/routes/research';
import yieldFarmingIndexRouter from './routes/yield-farming-api/routes/index';
import marketSignalV2Router from './routes/market-signal-v2-api/routes/intelligence';
import marketSignalV2OpenapiRouter from './routes/market-signal-v2-api/routes/openapi';
import websiteSpeedLiteRouter from './routes/website-speed-lite-api/routes/intelligence';
import websiteSpeedLiteOpenapiRouter from './routes/website-speed-lite-api/routes/openapi';
import companyLogoRouter from './routes/company-logo-api/routes/intelligence';
import companyLogoOpenapiRouter from './routes/company-logo-api/routes/openapi';
import unified_ai_docs   from './routes/unified-ai-completion-api/routes/docs';
import unified_ai_info   from './routes/unified-ai-completion-api/routes/info';
import unified_ai_router from './routes/unified-ai-completion-api/routes/index';
import agent_web_data_extraction_docs   from './routes/agent-web-data-extraction-api/routes/docs';
import agent_web_data_extraction_info   from './routes/agent-web-data-extraction-api/routes/info';
import agent_web_data_extraction_router from './routes/agent-web-data-extraction-api/routes/index';
import market_correlation_docs   from './routes/market-correlation-api/routes/docs';
import market_correlation_info   from './routes/market-correlation-api/routes/info';
import market_correlation_router from './routes/market-correlation-api/routes/index';
import yield_farming_docs   from './routes/yield-farming-api/routes/docs';
import yield_farming_info   from './routes/yield-farming-api/routes/info';
import yield_farming_router from './routes/yield-farming-api/routes/index';
import defi_risk_docs   from './routes/defi-risk-api/routes/docs';
import defi_risk_info   from './routes/defi-risk-api/routes/info';
import defi_risk_router from './routes/defi-risk-api/routes/index';
import liquidation_feed_docs   from './routes/liquidation-feed-api/routes/docs';
import liquidation_feed_info   from './routes/liquidation-feed-api/routes/info';
import liquidation_feed_router from './routes/liquidation-feed-api/routes/index';
import token_screener_docs   from './routes/token-screener-api/routes/docs';
import token_screener_info   from './routes/token-screener-api/routes/info';
import token_screener_router from './routes/token-screener-api/routes/index';
import cross_chain_bridge_docs   from './routes/cross-chain-bridge-api/routes/docs';
import cross_chain_bridge_info   from './routes/cross-chain-bridge-api/routes/info';
import cross_chain_bridge_router from './routes/cross-chain-bridge-api/routes/index';
import market_stress_docs   from './routes/market-stress-api/routes/docs';
import market_stress_info   from './routes/market-stress-api/routes/info';
import market_stress_router from './routes/market-stress-api/routes/index';
import strategy_signal_docs   from './routes/strategy-signal-api/routes/docs';
import strategy_signal_info   from './routes/strategy-signal-api/routes/info';
import strategy_signal_router from './routes/strategy-signal-api/routes/index';
import smart_contract_risk_docs   from './routes/smart-contract-risk-api/routes/docs';
import smart_contract_risk_info   from './routes/smart-contract-risk-api/routes/info';
import smart_contract_risk_router from './routes/smart-contract-risk-api/routes/index';
import crypto_trigger_docs   from './routes/crypto-trigger-api/routes/docs';
import crypto_trigger_info   from './routes/crypto-trigger-api/routes/info';
import crypto_trigger_router from './routes/crypto-trigger-api/routes/index';
import intelligence_extraction_docs   from './routes/intelligence-extraction-api/routes/docs';
import intelligence_extraction_info   from './routes/intelligence-extraction-api/routes/info';
import intelligence_extraction_router from './routes/intelligence-extraction-api/routes/index';
import career_optimization_docs   from './routes/career-optimization-api/routes/docs';
import career_optimization_info   from './routes/career-optimization-api/routes/info';
import career_optimization_router from './routes/career-optimization-api/routes/index';
import tx_simulator_docs   from './routes/tx-simulator-api/routes/docs';
import tx_simulator_info   from './routes/tx-simulator-api/routes/info';
import tx_simulator_router from './routes/tx-simulator-api/routes/index';
import outreach_execution_docs   from './routes/outreach-execution-api/routes/docs';
import outreach_execution_info   from './routes/outreach-execution-api/routes/info';
import outreach_execution_router from './routes/outreach-execution-api/routes/index';
import proposal_generation_docs   from './routes/proposal-generation-api/routes/docs';
import proposal_generation_info   from './routes/proposal-generation-api/routes/info';
import proposal_generation_router from './routes/proposal-generation-api/routes/index';
import voice_intelligence_docs   from './routes/voice-intelligence-api/routes/docs';
import voice_intelligence_info   from './routes/voice-intelligence-api/routes/info';
import voice_intelligence_router from './routes/voice-intelligence-api/routes/index';
import product_data_docs   from './routes/product-data-api/routes/docs';
import product_data_info   from './routes/product-data-api/routes/info';
import product_data_router from './routes/product-data-api/routes/index';
import agent_observability_docs   from './routes/agent-observability-api/routes/docs';
import agent_observability_info   from './routes/agent-observability-api/routes/info';
import agent_observability_router from './routes/agent-observability-api/routes/index';
import agent_identity_docs   from './routes/agent-identity-api/routes/docs';
import agent_identity_info   from './routes/agent-identity-api/routes/info';
import agent_identity_router from './routes/agent-identity-api/routes/index';
import real_time_monitor_docs   from './routes/real-time-monitor-api/routes/docs';
import real_time_monitor_info   from './routes/real-time-monitor-api/routes/info';
import real_time_monitor_router from './routes/real-time-monitor-api/routes/index';
import text_generation_docs   from './routes/text-generation-api/routes/docs';
import text_generation_info   from './routes/text-generation-api/routes/info';
import text_generation_router from './routes/text-generation-api/routes/index';
import defi_position_risk_docs   from './routes/defi-position-risk-api/routes/docs';
import defi_position_risk_info   from './routes/defi-position-risk-api/routes/info';
import defi_position_risk_router from './routes/defi-position-risk-api/routes/index';
import tokenomics_docs   from './routes/tokenomics-api/routes/docs';
import tokenomics_info   from './routes/tokenomics-api/routes/info';
import tokenomics_router from './routes/tokenomics-api/routes/index';
import derivatives_docs   from './routes/derivatives-api/routes/docs';
import derivatives_info   from './routes/derivatives-api/routes/info';
import derivatives_router from './routes/derivatives-api/routes/index';
import derivatives_intelligence_docs   from './routes/derivatives-intelligence-api/routes/docs';
import derivatives_intelligence_info   from './routes/derivatives-intelligence-api/routes/info';
import derivatives_intelligence_router from './routes/derivatives-intelligence-api/routes/index';
import complianceRouter from './routes/compliance-api/routes/intelligence';
import complianceOpenapiRouter from './routes/compliance-api/routes/openapi';
import agentPaymentsRouter from './routes/agent-payments-api/routes/intelligence';
import agentPaymentsOpenapiRouter from './routes/agent-payments-api/routes/openapi';
import browserAutomationRouter from './routes/browser-automation-api/routes/intelligence';
import browserAutomationOpenapiRouter from './routes/browser-automation-api/routes/openapi';
import meetingAnalyzerRouter from './routes/meeting-analyzer-api/routes/intelligence';
import meetingAnalyzerOpenapiRouter from './routes/meeting-analyzer-api/routes/openapi';
import crmUpdateRouter from './routes/crm-update-api/routes/intelligence';
import crmUpdateOpenapiRouter from './routes/crm-update-api/routes/openapi';
import calendarSchedulingRouter from './routes/calendar-scheduling-api/routes/intelligence';
import calendarSchedulingOpenapiRouter from './routes/calendar-scheduling-api/routes/openapi';
import deepResearchRouter from './routes/deep-research-api/routes/intelligence';
import deepResearchOpenapiRouter from './routes/deep-research-api/routes/openapi';
import workflowOrchestratorRouter from './routes/workflow-orchestrator-api/routes/intelligence';
import workflowOrchestratorOpenapiRouter from './routes/workflow-orchestrator-api/routes/openapi';
import shopifyAnalyzerRouter from './routes/shopify-analyzer-api/routes/intelligence';
import shopifyAnalyzerOpenapiRouter from './routes/shopify-analyzer-api/routes/openapi';
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
import { restaurantRouterMap, restaurantOpenapiMap } from './routes/restaurant-suite';
import emailIntelligenceRouter from './routes/email-intelligence-api/routes/intelligence';
import emailIntelligenceOpenapiRouter from './routes/email-intelligence-api/routes/openapi';
import pdfExtractionRouter from './routes/pdf-extraction-api/routes/intelligence';
import pdfExtractionOpenapiRouter from './routes/pdf-extraction-api/routes/openapi';
import 'dotenv/config';
import youtubeIntelligenceRouter from './routes/youtube-intelligence-api/routes/intelligence';
import youtubeIntelligenceOpenapiRouter from './routes/youtube-intelligence-api/routes/openapi';
import marketIntelligenceV2Router from './routes/market-data-api-v2/routes/intelligence';
import phoneOpenapiRouter from './routes/phone-validation-api/routes/openapi.route';
import { actionRouter, actionTaskTypesRouter } from './routes/action';
import { nftMetadataInfoRouter, nftTokenRouter, nftCollectionRouter, nftWalletRouter, nftTransfersRouter } from './routes/nft-metadata';
import { gasOptimizerInfoRouter, fundingRateInfoRouter, strategySignalInfoRouter, predictionMarketInfoRouter, tokenScreenerInfoRouter, tokenUnlockInfoRouter, agentIdentityInfoRouter, cryptoNarrativeInfoRouter, defiRiskInfoRouter, cryptoAlertsInfoRouter, agentSkillsInfoRouter, defiPositionInfoRouter, walletPortfolioInfoRouter, crossChainInfoRouter, derivativesInfoRouter, marketCorrelationInfoRouter, yieldFarmingInfoRouter, tokenomicsInfoRouter, liquidationFeedInfoRouter, marketStressInfoRouter, walletInfoRouter, stablecoinYieldInfoRouter, metaStrategyInfoRouter, socialSentimentInfoRouter, alphaSignalInfoRouter, actionInfoRouter, agentMemoryInfoRouter, agentWorkflowInfoRouter, autopilotInfoRouter, browserTaskInfoRouter, companyResearchInfoRouter, cryptoNewsInfoRouter, derivativesIntelligenceInfoRouter, devUtilitiesInfoRouter, extractionInfoRouter, leadDiscoveryInfoRouter, marketIntelligenceInfoRouter, marketSignalInfoRouter, marketTriggerInfoRouter, marketWebhookInfoRouter, onchainSignalInfoRouter, portfolioRebalanceInfoRouter, strategyExecutionInfoRouter, unifiedDecisionInfoRouter, websiteMonitorInfoRouter, aiOutputSafetyInfoRouter, documentIntelligenceInfoRouter, identityIntelligenceInfoRouter, imageToContentInfoRouter, leadEnrichmentInfoRouter, leadQualityInfoRouter, ipIntelligenceInfoRouter, emailValidationInfoRouter, phoneValidationInfoRouter, searchExtractInfoRouter, tokenTrustInfoRouter, trustInfoRouter, userRiskInfoRouter, walletIntelligenceInfoRouter, tokenPriceFeedInfoRouter, walletReputationInfoRouter, txSimulatorInfoRouter, contractAnalyzerInfoRouter, onchainNewsInfoRouter, ensResolverInfoRouter, webResearcherInfoRouter, textExtractorInfoRouter, decisionScorerInfoRouter , productDataInfoRouter, imageGenInfoRouter, webScraperInfoRouter, textGenInfoRouter, geocodingInfoRouter } from "./middleware/allApiInfo";
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import metaStrategyDocsRouter from './routes/meta-strategy-api/routes/docs';
import walletBalanceRouter from './routes/wallet/index';
import walletOpenapiRouter from './routes/wallet/openapi';
import agentMemoryOpenapiRouter from './routes/agent-memory-api/routes/openapi';
import cryptoNewsImpactOpenapiRouter from './routes/crypto-news-impact-api/routes/openapi';
import { openapiRouter as imageToContentOpenapiRouter } from './routes/image-to-content-api/routes/openapi.route';
import marketTriggerOpenapiRouter from './routes/market-trigger-api/routes/openapi';
import { openapiRouter as tokenTrustOpenapiRouter } from './routes/token-trust-api/routes/openapi.route';
import onchainSignalDocsRouter from './routes/onchain-signal-api/routes/docs';
import onchainSignalWhaleRouter from './routes/onchain-signal-api/routes/whale';
import marketWebhookOpenapiRouter from './routes/market-webhook-api/routes/openapi';
import stablecoinYieldDocsRouter from './routes/stablecoin-yield-api/routes/docs';
import alphaSignalDocsRouter from './routes/alpha-signal/docs';
import marketSnapshotRouter from './routes/market-snapshot/router';
import marketSnapshotOpenapiRouter from './routes/market-snapshot/openapi';
import alphaSignalRouter from './routes/alpha-signal/index';
import memoryRouter from './routes/agent-memory-api/routes/memory';
import sessionsRouter from './routes/agent-memory-api/routes/sessions';
import memoryCompressRouter from './routes/agent-memory-api/routes/compress';
import memoryExtractRouter from './routes/agent-memory-api/routes/extract';
import workflowRouter from './routes/agent-workflow-api/routes/workflow';
import agentWorkflowOpenapiRouter from './routes/agent-workflow-api/routes/openapi';
import leadDiscoveryOpenapiRouter from './routes/lead-discovery-api/routes/openapi';
import { openapiRouter as leadEnrichmentOpenapiRouter } from './routes/lead-enrichment-api/routes/openapi.route';
import { openapiRouter as leadQualityOpenapiRouter } from './routes/lead-quality-api/routes/openapi.route';
import { openapiRouter as documentIntelligenceOpenapiRouter } from './routes/document-intelligence-api/routes/openapi.route';
import websiteMonitorOpenapiRouter from './routes/website-monitor-api/routes/openapi';
import { openapiRouter as identityIntelligenceOpenapiRouter } from './routes/identity-intelligence-api/routes/openapi.route';
import portfolioRebalanceOpenapiRouter from './routes/portfolio-rebalance-api/routes/openapi';
import strategyExecutionOpenapiRouter from './routes/strategy-execution-api/routes/openapi';
import unifiedDecisionOpenapiRouter from './routes/unified-decision-api/routes/openapi';
import devUtilitiesOpenapiRouter from './routes/dev-utilities-api/routes/openapi';
import { safetyRouter } from './routes/ai-output-safety-api/routes/safety.route';
import { openapiRouter as aiOutputSafetyOpenapiRouter } from './routes/ai-output-safety-api/routes/openapi.route';
import autopilotRouter from './routes/autopilot-api/routes/autopilot';
import taskRouter from './routes/browser-task-api/routes/task';
import researchRouter from './routes/company-research-api/routes/research';
import companyResearchOpenapiRouter from './routes/company-research-api/routes/openapi';
import newsImpactRouter from './routes/crypto-news-impact-api/routes/newsImpact';
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
import { extractRouter } from './routes/document-intelligence-api/routes/extract.route';
import { validateRouter } from './routes/email-validation-api/routes/validate.route';
import extractionRouter from './routes/extraction-api/routes/extract';
import extractionIntelligenceRouter from './routes/extraction-api/routes/intelligence';
import intelligenceRouter from './routes/extraction-api/routes/intelligence';
import resumeRouter from './routes/resume-api/routes/resume';
import resumeOpenapiRouter from './routes/resume-api/routes/openapi';
import extractionOpenapiRouter from './routes/extraction-api/routes/openapi';
import { analyzeRouter } from './routes/identity-intelligence-api/routes/analyze.route';
import { analyzeRouter as imageAnalyzeRouter } from './routes/image-to-content-api/routes/analyze.route';
import { lookupRouter } from './routes/ip-intelligence-api/routes/lookup.route';
import leadsRouter from './routes/lead-discovery-api/routes/leads';
import { enrichRouter } from './routes/lead-enrichment-api/routes/enrich.route';
import { scoreRouter } from './routes/lead-quality-api/routes/score.route';
import marketIntelligenceRouter from './routes/market-intelligence-api/routes/intelligence';
import marketIntelligenceOpenapiRouter from './routes/market-intelligence-api/routes/openapi';
import marketSignalRouter from './routes/market-signal-api/routes/signal';
import marketSignalOpenapiRouter from './routes/market-signal-api/routes/openapi';
import marketTriggerRouter from './routes/market-trigger-api/routes/trigger';
import marketWebhookRouter from './routes/market-webhook-api/routes/webhooks';
import onchainTokenRouter from './routes/onchain-signal-api/routes/token';
import onchainWalletRouter from './routes/onchain-signal-api/routes/wallet';
import onchainWhaleRouter from './routes/onchain-signal-api/routes/whale';
import { validateRouter as phoneValidateRouter } from './routes/phone-validation-api/routes/validate.route';
import { intelligenceRouter as phoneIntelligenceRouter } from './routes/phone-validation-api/routes/intelligence.route';
import rebalanceRouter from './routes/portfolio-rebalance-api/routes/rebalance';
import strategiesRouter from './routes/portfolio-rebalance-api/routes/strategies';
import { searchRouter } from './routes/search-extract-api/routes/search.route';
import stablecoinRatesRouter from './routes/stablecoin-yield-api/routes/rates';
import stablecoinBestYieldRouter from './routes/stablecoin-yield-api/routes/bestYield';
import stablecoinCompareRouter from './routes/stablecoin-yield-api/routes/compare';
import stablecoinProtocolRouter from './routes/stablecoin-yield-api/routes/protocol';
import strategyExecutionRouter from './routes/strategy-execution-api/routes/strategy';
import { tokenRouter } from './routes/token-trust-api/routes/token.route';
import { trustRouter } from './routes/trust-api/routes/trust.route';
import unifiedDecisionRouter from './routes/unified-decision-api/routes/decide';
import { riskRouter } from './routes/user-risk-api/routes/risk.route';
import { walletRouter } from './routes/wallet-intelligence-api/routes/wallet.route';
import monitorsRouter from './routes/website-monitor-api/routes/monitors';
import socialSentimentRouter from './routes/social-sentiment/index';
import gasNowRouter from "./routes/gas-optimizer-api/routes/gasNow";
import gasEstimateRouter from "./routes/gas-optimizer-api/routes/gasEstimate";
import gasCompareRouter from "./routes/gas-optimizer-api/routes/gasCompare";
import gasTimingRouter from "./routes/gas-optimizer-api/routes/gasTiming";
import agentSkillsDocsRouter from './routes/agent-skills-api/routes/docs';
import strategySignalRouter from './routes/strategy-signal-api/routes/strategy';
import predictionTrendingRouter from './routes/prediction-market-api/routes/trending';
import predictionSearchRouter from './routes/prediction-market-api/routes/search';
import predictionMarketRouter from './routes/prediction-market-api/routes/market';
import predictionSignalRouter from './routes/prediction-market-api/routes/signal';
import fundingNowRouter from './routes/funding-rate-api/routes/now';
import fundingCompareRouter from './routes/funding-rate-api/routes/compare';
import fundingExtremesRouter from './routes/funding-rate-api/routes/extremes';
import fundingSignalRouter from './routes/funding-rate-api/routes/signal';
import tokenScreenRouter from './routes/token-screener-api/routes/screen';
import tokenMoversRouter from './routes/token-screener-api/routes/movers';
import tokenOpportunitiesRouter from './routes/token-screener-api/routes/opportunities';
import metaStrategyScanRouter from './routes/meta-strategy-api/routes/scan';
import tokenUnlockUpcomingRouter from './routes/token-unlock-api/routes/upcoming';
import tokenUnlockVestingRouter from './routes/token-unlock-api/routes/vesting';
import tokenUnlockImpactRouter from './routes/token-unlock-api/routes/impact';
import tokenUnlockCalendarRouter from './routes/token-unlock-api/routes/calendar';
import agentIdentityRouter from './apis/agent-identity/routes';
import cryptoNarrativeTrendingRouter from './routes/crypto-narrative-api/routes/trending';
import cryptoNarrativeRouter from './routes/crypto-narrative-api/routes/narrative';
import cryptoNarrativeCompareRouter from './routes/crypto-narrative-api/routes/compare';
import cryptoNarrativeScanRouter from './routes/crypto-narrative-api/routes/scan';
import defiRiskTokenSafetyRouter from './routes/defi-risk-api/routes/tokenSafety';
import defiRiskProtocolRouter from './routes/defi-risk-api/routes/protocolRisk';
import defiRiskLiquidityRouter from './routes/defi-risk-api/routes/liquidityHealth';
import defiRiskPortfolioRouter from './routes/defi-risk-api/routes/portfolioScan';
import cryptoAlertsRouter from './routes/crypto-alerts-api/index';
import agentSkillsRegisterRouter from './routes/agent-skills-api/routes/register';
import agentSkillsDiscoverRouter from './routes/agent-skills-api/routes/discover';
import agentSkillsDetailRouter from './routes/agent-skills-api/routes/skillDetail';
import agentSkillsMatchRouter from './routes/agent-skills-api/routes/match';
import agentSkillsTrendingRouter from './routes/agent-skills-api/routes/trending';
import agentSkillsComposeRouter from './routes/agent-skills-api/routes/compose';
import defiPositionMonitorRouter from './routes/defi-position-monitor-api/index';
import walletPortfolioSnapshotRouter from './routes/wallet-portfolio-api/routes/snapshot';
import walletPortfolioPnlRouter from './routes/wallet-portfolio-api/routes/pnl';
import walletPortfolioScoreRouter from './routes/wallet-portfolio-api/routes/score';
import { router as crossChainRouter } from './routes/cross-chain-bridge-api/routes';
import { router as derivativesRouter } from './routes/derivatives-api/routes';
import { router as marketCorrelationRouter } from './routes/market-correlation-api/routes';
import { router as yieldFarmingRouter } from './routes/yield-farming-api/routes';
import { router as derivativesIntelligenceRouter } from './routes/derivatives-intelligence-api/routes';
import { router as tokenomicsRouter } from './routes/tokenomics-api/routes';
import { router as liquidationFeedRouter } from './routes/liquidation-feed-api/routes';
import { router as marketStressRouter } from './routes/market-stress-api/routes';
import decisionScorerRouter from "./routes/decision-scorer/routes/score";
import textExtractorRouter from "./routes/text-extractor/routes/extract";
import webResearcherRouter from "./routes/web-researcher/routes/research";
import ensResolverRouter from "./routes/ens-resolver/routes/ens";
import onchainNewsRouter from "./routes/onchain-news/routes/news";
import contractAnalyzerRouter from "./routes/contract-analyzer/routes/analyze";
import txSimulatorRouter from "./routes/tx-simulator/routes/simulate";
import walletReputationRouter from "./routes/wallet-reputation/routes/reputation";
import tokenPriceFeedRouter from "./routes/token-price-feed/routes/price";
import productDataRouter from './routes/productdata-api/index';
import imageGenRouter from './routes/image-gen/router';
import textGenRouter from './routes/text-gen/router';
import textGenOpenapiRouter from './routes/text-gen/openapi';
import geocodingRouter from './routes/geocoding/router';
import webScraperRouter from './routes/web-scraper/router';
import socialIntelligenceRouter from './routes/social-intelligence-api/routes/intelligence';
import socialIntelligenceOpenapiRouter from './routes/social-intelligence-api/routes/openapi';
import dataConnectorRouter from './routes/data-connector-api/routes/intelligence';
import dataConnectorOpenapiRouter from './routes/data-connector-api/routes/openapi';
import voiceIntelligenceRouter from './routes/voice-intelligence-api/routes/intelligence';
import voiceIntelligenceOpenapiRouter from './routes/voice-intelligence-api/routes/openapi';
import agentEvalRouter from './routes/agent-eval-api/routes/intelligence';
import agentEvalOpenapiRouter from './routes/agent-eval-api/routes/openapi';
import proposalGenerationRouter from './routes/proposal-generation-api/routes/intelligence';
import proposalGenerationOpenapiRouter from './routes/proposal-generation-api/routes/openapi';
import outreachExecutionRouter from './routes/outreach-execution-api/routes/intelligence';
import outreachExecutionOpenapiRouter from './routes/outreach-execution-api/routes/openapi';
import realTimeMonitorRouter from './routes/real-time-monitor-api/routes/intelligence';
import realTimeMonitorOpenapiRouter from './routes/real-time-monitor-api/routes/openapi';
import computerUseRouter from './routes/computer-use-api/routes/intelligence';
import computerUseOpenapiRouter from './routes/computer-use-api/routes/openapi';
import browserTaskIntelligenceRouter from './routes/browser-task-api/routes/intelligence';
import enterpriseRetrievalRouter from './routes/enterprise-retrieval-api/routes/intelligence';
import enterpriseRetrievalOpenapiRouter from './routes/enterprise-retrieval-api/routes/openapi';
import multiAgentRouter from './routes/multi-agent-api/routes/intelligence';
import multiAgentOpenapiRouter from './routes/multi-agent-api/routes/openapi';
import agentObservabilityRouter from './routes/agent-observability-api/routes/intelligence';
import agentObservabilityOpenapiRouter from './routes/agent-observability-api/routes/openapi';
import contextCompressionRouter from './routes/context-compression-api/routes/intelligence';
import contextCompressionOpenapiRouter from './routes/context-compression-api/routes/openapi';
import factVerificationRouter from './routes/fact-verification-api/routes/intelligence';
import factVerificationOpenapiRouter from './routes/fact-verification-api/routes/openapi';
import legalContractRiskRouter from './routes/legal-contract-risk-api/routes/intelligence';
import legalContractRiskOpenapiRouter from './routes/legal-contract-risk-api/routes/openapi';
import earningsAnalyzerRouter from './routes/earnings-analyzer-api/routes/intelligence';
import earningsAnalyzerOpenapiRouter from './routes/earnings-analyzer-api/routes/openapi';
import portfolioRiskRouter from './routes/portfolio-risk-api/routes/intelligence';
import portfolioRiskOpenapiRouter from './routes/portfolio-risk-api/routes/openapi';
import financialNewsMonitorRouter from './routes/financial-news-monitor-api/routes/intelligence';
import financialNewsMonitorOpenapiRouter from './routes/financial-news-monitor-api/routes/openapi';
import webNavigationRouter from './routes/web-navigation-api/routes/intelligence';
import webNavigationOpenapiRouter from './routes/web-navigation-api/routes/openapi';
import redditIntelligenceRouter from './routes/reddit-intelligence-api/routes/intelligence';
import redditIntelligenceOpenapiRouter from './routes/reddit-intelligence-api/routes/openapi';
import vendorRankingRouter from './routes/vendor-ranking-api/routes/intelligence';
import vendorRankingOpenapiRouter from './routes/vendor-ranking-api/routes/openapi';
import secFilingIntelligenceRouter from './routes/sec-filing-intelligence-api/routes/intelligence';
import secFilingIntelligenceOpenapiRouter from './routes/sec-filing-intelligence-api/routes/openapi';
import economicCalendarRouter from './routes/economic-calendar-api/routes/intelligence';
import economicCalendarOpenapiRouter from './routes/economic-calendar-api/routes/openapi';
import reputationIntelligenceRouter from './routes/reputation-intelligence-api/routes/intelligence';
import reputationIntelligenceOpenapiRouter from './routes/reputation-intelligence-api/routes/openapi';
import supplyChainRiskRouter from './routes/supply-chain-risk-api/routes/intelligence';
import supplyChainRiskOpenapiRouter from './routes/supply-chain-risk-api/routes/openapi';
import autonomousNegotiationRouter from './routes/autonomous-negotiation-api/routes/intelligence';
import autonomousNegotiationOpenapiRouter from './routes/autonomous-negotiation-api/routes/openapi';
import corporateActionsRouter from './routes/corporate-actions-api/routes/intelligence';
import corporateActionsOpenapiRouter from './routes/corporate-actions-api/routes/openapi';
import knowledgeGraphRouter from './routes/knowledge-graph-api/routes/intelligence';
import knowledgeGraphOpenapiRouter from './routes/knowledge-graph-api/routes/openapi';
import riskEventForecastRouter from './routes/risk-event-forecast-api/routes/intelligence';
import riskEventForecastOpenapiRouter from './routes/risk-event-forecast-api/routes/openapi';
import salesIntelligenceRouter from './routes/sales-intelligence-api/routes/intelligence';
import salesIntelligenceOpenapiRouter from './routes/sales-intelligence-api/routes/openapi';
import qaTestingRouter from './routes/qa-testing-api/routes/intelligence';
import qaTestingOpenapiRouter from './routes/qa-testing-api/routes/openapi';
import linkedinProfileRouter from './routes/linkedin-profile-api/routes/intelligence';
import linkedinProfileOpenapiRouter from './routes/linkedin-profile-api/routes/openapi';
import companyEnrichmentApiRouter from './routes/company-enrichment-api/routes/intelligence';
import companyEnrichmentApiOpenapiRouter from './routes/company-enrichment-api/routes/openapi';
import emailFinderRouter from './routes/email-finder-api/routes/intelligence';
import emailFinderOpenapiRouter from './routes/email-finder-api/routes/openapi';
import stockQuoteRouter from './routes/stock-quote-api/routes/intelligence';
import stockQuoteOpenapiRouter from './routes/stock-quote-api/routes/openapi';
import imageOcrRouter from './routes/image-ocr-api/routes/intelligence';
import imageOcrOpenapiRouter from './routes/image-ocr-api/routes/openapi';
import websiteScreenshotRouter from './routes/website-screenshot-api/routes/intelligence';
import websiteScreenshotOpenapiRouter from './routes/website-screenshot-api/routes/openapi';
import jobPostingSearchRouter from './routes/job-posting-search-api/routes/intelligence';
import jobPostingSearchOpenapiRouter from './routes/job-posting-search-api/routes/openapi';
import githubRepoStatsRouter from './routes/github-repo-stats-api/routes/intelligence';
import githubRepoStatsOpenapiRouter from './routes/github-repo-stats-api/routes/openapi';
import openapiValidatorRouter from './routes/openapi-validator-api/routes/intelligence';
import openapiValidatorOpenapiRouter from './routes/openapi-validator-api/routes/openapi';
import addressRiskRouter from './routes/address-risk-api/routes/intelligence';
import addressRiskOpenapiRouter from './routes/address-risk-api/routes/openapi';
import domainIntelligenceApiRouter from './routes/domain-intelligence-api/routes/intelligence';
import domainIntelligenceApiOpenapiRouter from './routes/domain-intelligence-api/routes/openapi';
import webPageExtractorRouter from './routes/web-page-extractor-api/routes/intelligence';
import webPageExtractorOpenapiRouter from './routes/web-page-extractor-api/routes/openapi';
import newsSearchRouter from './routes/news-search-api/routes/intelligence';
import newsSearchOpenapiRouter from './routes/news-search-api/routes/openapi';
import cryptoPriceRouter from './routes/crypto-price-api/routes/intelligence';
import cryptoPriceOpenapiRouter from './routes/crypto-price-api/routes/openapi';
import fearGreedRouter from './routes/fear-greed-api/routes/intelligence';
import fearGreedOpenapiRouter from './routes/fear-greed-api/routes/openapi';
import stablecoinDepegRouter from './routes/stablecoin-depeg-api/routes/intelligence';
import stablecoinDepegOpenapiRouter from './routes/stablecoin-depeg-api/routes/openapi';
import topMoversRouter from './routes/top-movers-api/routes/intelligence';
import topMoversOpenapiRouter from './routes/top-movers-api/routes/openapi';
// crypto-risk-suite imports
import liquidationCascadeRouter from './routes/liquidation-cascade-api/routes/intelligence';
import liquidationCascadeOpenapiRouter from './routes/liquidation-cascade-api/routes/openapi';
import fundingRateDivergenceRouter from './routes/funding-rate-divergence-api/routes/intelligence';
import fundingRateDivergenceOpenapiRouter from './routes/funding-rate-divergence-api/routes/openapi';
import openInterestIntelligenceRouter from './routes/open-interest-intelligence-api/routes/intelligence';
import openInterestIntelligenceOpenapiRouter from './routes/open-interest-intelligence-api/routes/openapi';
import orderbookImbalanceRouter from './routes/orderbook-imbalance-api/routes/intelligence';
import orderbookImbalanceOpenapiRouter from './routes/orderbook-imbalance-api/routes/openapi';
import stopHuntDetectionRouter from './routes/stop-hunt-detection-api/routes/intelligence';
import stopHuntDetectionOpenapiRouter from './routes/stop-hunt-detection-api/routes/openapi';
import aiRiskManagerRouter from './routes/ai-risk-manager-api/routes/intelligence';
import aiRiskManagerOpenapiRouter from './routes/ai-risk-manager-api/routes/openapi';
import positionSizingRouter from './routes/position-sizing-api/routes/intelligence';
import positionSizingOpenapiRouter from './routes/position-sizing-api/routes/openapi';
import aiPortfolioHedgingRouter from './routes/ai-portfolio-hedging-api/routes/intelligence';
import aiPortfolioHedgingOpenapiRouter from './routes/ai-portfolio-hedging-api/routes/openapi';
import tradeExecutionTimingRouter from './routes/trade-execution-timing-api/routes/intelligence';
import tradeExecutionTimingOpenapiRouter from './routes/trade-execution-timing-api/routes/openapi';
import smartMoneyRotationRouter from './routes/smart-money-rotation-api/routes/intelligence';
import smartMoneyRotationOpenapiRouter from './routes/smart-money-rotation-api/routes/openapi';
import yieldFarmingOptimizerRouter from './routes/yield-farming-optimizer-api/routes/intelligence';
import yieldFarmingOptimizerOpenapiRouter from './routes/yield-farming-optimizer-api/routes/openapi';
import impermanentLossRouter from './routes/impermanent-loss-api/routes/intelligence';
import impermanentLossOpenapiRouter from './routes/impermanent-loss-api/routes/openapi';
import nftFloorPriceRouter from './routes/nft-floor-price-api/routes/intelligence';
import nftFloorPriceOpenapiRouter from './routes/nft-floor-price-api/routes/openapi';
import stakingRewardsRouter from './routes/staking-rewards-api/routes/intelligence';
import stakingRewardsOpenapiRouter from './routes/staking-rewards-api/routes/openapi';
import whaleWalletTrackerRouter from './routes/whale-wallet-tracker-api/routes/intelligence';
import whaleWalletTrackerOpenapiRouter from './routes/whale-wallet-tracker-api/routes/openapi';
import smartMoneyFlowRouter from './routes/smart-money-flow-api/routes/intelligence';
import smartMoneyFlowOpenapiRouter from './routes/smart-money-flow-api/routes/openapi';
import memeCoinIntelligenceRouter from './routes/meme-coin-intelligence-api/routes/intelligence';
import memeCoinIntelligenceOpenapiRouter from './routes/meme-coin-intelligence-api/routes/openapi';
import crossExchangeArbitrageRouter from './routes/cross-exchange-arbitrage-api/routes/intelligence';
import crossExchangeArbitrageOpenapiRouter from './routes/cross-exchange-arbitrage-api/routes/openapi';
import marketDominanceRouter from './routes/market-dominance-api/routes/intelligence';
import marketDominanceOpenapiRouter from './routes/market-dominance-api/routes/openapi';
import tokenHolderDistributionRouter from './routes/token-holder-distribution-api/routes/intelligence';
import tokenHolderDistributionOpenapiRouter from './routes/token-holder-distribution-api/routes/openapi';
import lendingRatesRouter from './routes/lending-rates-api/routes/intelligence';
import lendingRatesOpenapiRouter from './routes/lending-rates-api/routes/openapi';
import borrowingRatesRouter from './routes/borrowing-rates-api/routes/intelligence';
import borrowingRatesOpenapiRouter from './routes/borrowing-rates-api/routes/openapi';
import tvlAnalyticsRouter from './routes/tvl-analytics-api/routes/intelligence';
import tvlAnalyticsOpenapiRouter from './routes/tvl-analytics-api/routes/openapi';
import honeypotScannerRouter from './routes/honeypot-scanner-api/routes/intelligence';
import honeypotScannerOpenapiRouter from './routes/honeypot-scanner-api/routes/openapi';
import aiDueDiligenceRouter from './routes/ai-due-diligence-api/routes/intelligence';
import ipSubnetCalculatorRouter from './routes/ip-subnet-calculator-api/routes/intelligence';
import ipSubnetCalculatorOpenapiRouter from './routes/ip-subnet-calculator-api/routes/openapi';
import uuidUlidRouter from './routes/uuid-ulid-generator-api/routes/intelligence';
import uuidUlidOpenapiRouter from './routes/uuid-ulid-generator-api/routes/openapi';
import colorContrastRouter from './routes/color-contrast-evaluator-api/routes/intelligence';
import colorContrastOpenapiRouter from './routes/color-contrast-evaluator-api/routes/openapi';
import geoCoordinateRouter from './routes/geo-coordinate-calculator-api/routes/intelligence';
import geoCoordinateOpenapiRouter from './routes/geo-coordinate-calculator-api/routes/openapi';
import timezoneHarmonizerRouter from './routes/timezone-harmonizer-api/routes/intelligence';
import timezoneHarmonizerOpenapiRouter from './routes/timezone-harmonizer-api/routes/openapi';
import nftCollectionAnalyticsRouter from './routes/nft-collection-analytics-api/routes/intelligence';
import nftCollectionAnalyticsOpenapiRouter from './routes/nft-collection-analytics-api/routes/openapi';
import aiTradeConfidenceRouter from './routes/ai-trade-confidence-api/routes/intelligence';
import aiTradeConfidenceOpenapiRouter from './routes/ai-trade-confidence-api/routes/openapi';
import ohlcvCandlestickRouter from './routes/ohlcv-candlestick-api/routes/intelligence';
import ohlcvCandlestickOpenapiRouter from './routes/ohlcv-candlestick-api/routes/openapi';
import multiExchangeTickerRouter from './routes/multi-exchange-ticker-api/routes/intelligence';
import multiExchangeTickerOpenapiRouter from './routes/multi-exchange-ticker-api/routes/openapi';
import breakoutDetectionRouter from './routes/breakout-detection-api/routes/intelligence';
import breakoutDetectionOpenapiRouter from './routes/breakout-detection-api/routes/openapi';
import rsiSignalRouter from './routes/rsi-signal-api/routes/intelligence';
import rsiSignalOpenapiRouter from './routes/rsi-signal-api/routes/openapi';
import macdSignalRouter from './routes/macd-signal-api/routes/intelligence';
import macdSignalOpenapiRouter from './routes/macd-signal-api/routes/openapi';
import bollingerBandRouter from './routes/bollinger-band-api/routes/intelligence';
import bollingerBandOpenapiRouter from './routes/bollinger-band-api/routes/openapi';
import whaleEntrySignalRouter from './routes/whale-entry-signal-api/routes/intelligence';
import whaleEntrySignalOpenapiRouter from './routes/whale-entry-signal-api/routes/openapi';
import scalpingOpportunityRouter from './routes/scalping-opportunity-api/routes/intelligence';
import scalpingOpportunityOpenapiRouter from './routes/scalping-opportunity-api/routes/openapi';
import dexCexArbitrageRouter from './routes/dex-cex-arbitrage-api/routes/intelligence';
import dexCexArbitrageOpenapiRouter from './routes/dex-cex-arbitrage-api/routes/openapi';
import triangularArbitrageRouter from './routes/triangular-arbitrage-api/routes/intelligence';
import triangularArbitrageOpenapiRouter from './routes/triangular-arbitrage-api/routes/openapi';
import stablecoinArbitrageRouter from './routes/stablecoin-arbitrage-api/routes/intelligence';
import stablecoinArbitrageOpenapiRouter from './routes/stablecoin-arbitrage-api/routes/openapi';
import crossChainArbitrageRouter from './routes/cross-chain-arbitrage-api/routes/intelligence';
import crossChainArbitrageOpenapiRouter from './routes/cross-chain-arbitrage-api/routes/openapi';
import gasAdjustedArbitrageRouter from './routes/gas-adjusted-arbitrage-api/routes/intelligence';
import gasAdjustedArbitrageOpenapiRouter from './routes/gas-adjusted-arbitrage-api/routes/openapi';
import flashLoanOpportunityRouter from './routes/flash-loan-opportunity-api/routes/intelligence';
import flashLoanOpportunityOpenapiRouter from './routes/flash-loan-opportunity-api/routes/openapi';
import marketInefficiencyScannerRouter from './routes/market-inefficiency-scanner-api/routes/intelligence';
import marketInefficiencyScannerOpenapiRouter from './routes/market-inefficiency-scanner-api/routes/openapi';
import smartWalletDiscoveryRouter from './routes/smart-wallet-discovery-api/routes/intelligence';
import smartWalletDiscoveryOpenapiRouter from './routes/smart-wallet-discovery-api/routes/openapi';
import walletCopyTradingRouter from './routes/wallet-copy-trading-api/routes/intelligence';
import walletCopyTradingOpenapiRouter from './routes/wallet-copy-trading-api/routes/openapi';
import insiderWalletDetectionRouter from './routes/insider-wallet-detection-api/routes/intelligence';
import insiderWalletDetectionOpenapiRouter from './routes/insider-wallet-detection-api/routes/openapi';
import dormantWalletAwakeningRouter from './routes/dormant-wallet-awakening-api/routes/intelligence';
import dormantWalletAwakeningOpenapiRouter from './routes/dormant-wallet-awakening-api/routes/openapi';
import whaleTransactionRouter from './routes/whale-transaction-api/routes/intelligence';
import whaleTransactionOpenapiRouter from './routes/whale-transaction-api/routes/openapi';
import validatorActivityRouter from './routes/validator-activity-api/routes/intelligence';
import validatorActivityOpenapiRouter from './routes/validator-activity-api/routes/openapi';
import crossChainLiquidityRouter from './routes/cross-chain-liquidity-api/routes/intelligence';
import crossChainLiquidityOpenapiRouter from './routes/cross-chain-liquidity-api/routes/openapi';
import fxRatesRouter from './routes/fx-rates-api/routes/intelligence';
import fxRatesOpenapiRouter from './routes/fx-rates-api/routes/openapi';
import weatherRouter from './routes/weather-api/routes/intelligence';
import weatherOpenapiRouter from './routes/weather-api/routes/openapi';
import geocodingIntelligenceRouter from './routes/geocoding-api/routes/intelligence';
import geocodingIntelligenceOpenapiRouter from './routes/geocoding-api/routes/openapi';
import ipGeolocationRouter from './routes/ip-geolocation-api/routes/intelligence';
import ipGeolocationOpenapiRouter from './routes/ip-geolocation-api/routes/openapi';
import phoneValidationIntelligenceRouter from './routes/phone-validation-api/routes/intelligence';
import phoneValidationIntelligenceOpenapiRouter from './routes/phone-validation-api/routes/openapi';
import addressValidationApiRouter from './routes/address-validation-api/routes/intelligence';
import addressValidationApiOpenapiRouter from './routes/address-validation-api/routes/openapi';
import dueDiligenceRouter from './routes/due-diligence-api/routes/intelligence';
import dueDiligenceOpenapiRouter from './routes/due-diligence-api/routes/openapi';
import logoFinderRouter from './routes/logo-finder-api/routes/intelligence';
import logoFinderOpenapiRouter from './routes/logo-finder-api/routes/openapi';
import faviconRouter from './routes/favicon-api/routes/intelligence';
import faviconOpenapiRouter from './routes/favicon-api/routes/openapi';
import pdfExtractionIntelligenceRouter from './routes/pdf-extraction-api/routes/intelligence';
import pdfExtractionIntelligenceOpenapiRouter from './routes/pdf-extraction-api/routes/openapi';
import qrBarcodeRouter from './routes/qr-barcode-api/routes/intelligence';
import qrBarcodeOpenapiRouter from './routes/qr-barcode-api/routes/openapi';
import urlScreenshotDiffRouter from './routes/url-screenshot-diff-api/routes/intelligence';
import urlScreenshotDiffOpenapiRouter from './routes/url-screenshot-diff-api/routes/openapi';
import websiteChangeMonitorRouter from './routes/website-change-monitor-api/routes/intelligence';
import websiteChangeMonitorOpenapiRouter from './routes/website-change-monitor-api/routes/openapi';
import priceMonitorRouter from './routes/price-monitor-api/routes/intelligence';
import priceMonitorOpenapiRouter from './routes/price-monitor-api/routes/openapi';
import productDataIntelligenceRouter from './routes/product-data-api/routes/intelligence';
import productDataIntelligenceOpenapiRouter from './routes/product-data-api/routes/openapi';
import amazonProductRouter from './routes/amazon-product-api/routes/intelligence';
import amazonProductOpenapiRouter from './routes/amazon-product-api/routes/openapi';
import resumeParserRouter from './routes/resume-parser-api/routes/intelligence';
import resumeParserOpenapiRouter from './routes/resume-parser-api/routes/openapi';
import atsKeywordRouter from './routes/ats-keyword-api/routes/intelligence';
import atsKeywordOpenapiRouter from './routes/ats-keyword-api/routes/openapi';
import calendarHolidayRouter from './routes/calendar-holiday-api/routes/intelligence';
import calendarHolidayOpenapiRouter from './routes/calendar-holiday-api/routes/openapi';
import timezoneRouter from './routes/timezone-api/routes/intelligence';
import timezoneOpenapiRouter from './routes/timezone-api/routes/openapi';
import currencyFormattingRouter from './routes/currency-formatting-api/routes/intelligence';
import currencyFormattingOpenapiRouter from './routes/currency-formatting-api/routes/openapi';
import unitConversionRouter from './routes/unit-conversion-api/routes/intelligence';
import unitConversionOpenapiRouter from './routes/unit-conversion-api/routes/openapi';
import aesVaultRouter from './routes/aes-vault-api/routes/intelligence';
import aesVaultOpenapiRouter from './routes/aes-vault-api/routes/openapi';
import cronExplainerRouter from './routes/cron-explainer-api/routes/intelligence';
import cronExplainerOpenapiRouter from './routes/cron-explainer-api/routes/openapi';
import refinanceCalculatorRouter from './routes/refinance-calculator-api/routes/intelligence';
import refinanceCalculatorOpenapiRouter from './routes/refinance-calculator-api/routes/openapi';
import mortgageRefinanceRouter from './routes/mortgage-refinance-api/routes/intelligence';
import mortgageRefinanceOpenapiRouter from './routes/mortgage-refinance-api/routes/openapi';
import emergencyFundCalculatorRouter from './routes/emergency-fund-calculator-api/routes/intelligence';
import emergencyFundCalculatorOpenapiRouter from './routes/emergency-fund-calculator-api/routes/openapi';
import financialHealthCheckerRouter from './routes/financial-health-checker-api/routes/intelligence';
import financialHealthCheckerOpenapiRouter from './routes/financial-health-checker-api/routes/openapi';
import personalFinanceAgentRouter from './routes/personal-finance-agent-api/routes/intelligence';
import personalFinanceAgentOpenapiRouter from './routes/personal-finance-agent-api/routes/openapi';
import debtPayoffPlannerRouter from './routes/debt-payoff-planner-api/routes/intelligence';
import debtPayoffPlannerOpenapiRouter from './routes/debt-payoff-planner-api/routes/openapi';
import retirementPlannerRouter from './routes/retirement-planner-api/routes/intelligence';
import retirementPlannerOpenapiRouter from './routes/retirement-planner-api/routes/openapi';
import savingsGoalOptimizerRouter from './routes/savings-goal-optimizer-api/routes/intelligence';
import savingsGoalOptimizerOpenapiRouter from './routes/savings-goal-optimizer-api/routes/openapi';
import budgetPlannerRouter from './routes/budget-planner-api/routes/intelligence';
import budgetPlannerOpenapiRouter from './routes/budget-planner-api/routes/openapi';
import netWorthTrackerRouter from './routes/net-worth-tracker-api/routes/intelligence';
import netWorthTrackerOpenapiRouter from './routes/net-worth-tracker-api/routes/openapi';
import creditScoreEstimatorRouter from './routes/credit-score-estimator-api/routes/intelligence';
import creditScoreEstimatorOpenapiRouter from './routes/credit-score-estimator-api/routes/openapi';
import insuranceNeedsCalculatorRouter from './routes/insurance-needs-calculator-api/routes/intelligence';
import insuranceNeedsCalculatorOpenapiRouter from './routes/insurance-needs-calculator-api/routes/openapi';
import loanAffordabilityCalculatorRouter from './routes/loan-affordability-calculator-api/routes/intelligence';
import loanAffordabilityCalculatorOpenapiRouter from './routes/loan-affordability-calculator-api/routes/openapi';
import rentVsBuyCalculatorRouter from './routes/rent-vs-buy-calculator-api/routes/intelligence';
import rentVsBuyCalculatorOpenapiRouter from './routes/rent-vs-buy-calculator-api/routes/openapi';
import dtiCalculatorRouter from './routes/dti-calculator-api/routes/intelligence';
import dtiCalculatorOpenapiRouter from './routes/dti-calculator-api/routes/openapi';
import dataValidatorRouter from './routes/data-validator-api/routes/intelligence';
import dataValidatorOpenapiRouter from './routes/data-validator-api/routes/openapi';
import randomDataGeneratorRouter from './routes/random-data-generator-api/routes/intelligence';
import randomDataGeneratorOpenapiRouter from './routes/random-data-generator-api/routes/openapi';
import webContentDiffCheckerRouter from './routes/web-content-diff-checker-api/routes/intelligence';
import webContentDiffCheckerOpenapiRouter from './routes/web-content-diff-checker-api/routes/openapi';
import webVitalsGraderRouter from './routes/web-vitals-grader-api/routes/intelligence';
import webVitalsGraderOpenapiRouter from './routes/web-vitals-grader-api/routes/openapi';
import webContentTypeClassifierRouter from './routes/web-content-type-classifier-api/routes/intelligence';
import webContentTypeClassifierOpenapiRouter from './routes/web-content-type-classifier-api/routes/openapi';
import webPerformanceBudgetCheckerRouter from './routes/web-performance-budget-checker-api/routes/intelligence';
import webPerformanceBudgetCheckerOpenapiRouter from './routes/web-performance-budget-checker-api/routes/openapi';
import webScrapeRateLimiterRouter from './routes/web-scrape-rate-limiter-api/routes/intelligence';
import webScrapeRateLimiterOpenapiRouter from './routes/web-scrape-rate-limiter-api/routes/openapi';
import webContentFreshnessScorerRouter from './routes/web-content-freshness-scorer-api/routes/intelligence';
import webContentFreshnessScorerOpenapiRouter from './routes/web-content-freshness-scorer-api/routes/openapi';
import webArchiveUrlBuilderRouter from './routes/web-archive-url-builder-api/routes/intelligence';
import webArchiveUrlBuilderOpenapiRouter from './routes/web-archive-url-builder-api/routes/openapi';
import webScrapeCostRoiAnalyzerRouter from './routes/web-scrape-cost-roi-analyzer-api/routes/intelligence';
import webScrapeCostRoiAnalyzerOpenapiRouter from './routes/web-scrape-cost-roi-analyzer-api/routes/openapi';
import webhookSignatureVerifierRouter from './routes/webhook-signature-verifier-api/routes/intelligence';
import webhookSignatureVerifierOpenapiRouter from './routes/webhook-signature-verifier-api/routes/openapi';
import webhookReliabilityScorerRouter from './routes/webhook-reliability-scorer-api/routes/intelligence';
import webhookReliabilityScorerOpenapiRouter from './routes/webhook-reliability-scorer-api/routes/openapi';
import webhookValidatorRouter from './routes/webhook-validator-api/routes/intelligence';
import webhookValidatorOpenapiRouter from './routes/webhook-validator-api/routes/openapi';
import webhookPayloadBuilderRouter from './routes/webhook-payload-builder-api/routes/intelligence';
import webhookPayloadBuilderOpenapiRouter from './routes/webhook-payload-builder-api/routes/openapi';
import jsonToCsvRouter from './routes/json-to-csv-api/routes/intelligence';
import jsonToCsvOpenapiRouter from './routes/json-to-csv-api/routes/openapi';
import taxRateRouter from './routes/tax-rate-api/routes/intelligence';
import taxRateOpenapiRouter from './routes/tax-rate-api/routes/openapi';
import shippingRateRouter from './routes/shipping-rate-api/routes/intelligence';
import shippingRateOpenapiRouter from './routes/shipping-rate-api/routes/openapi';
import packageTrackingRouter from './routes/package-tracking-api/routes/intelligence';
import packageTrackingOpenapiRouter from './routes/package-tracking-api/routes/openapi';
import flightStatusRouter from './routes/flight-status-api/routes/intelligence';
import flightStatusOpenapiRouter from './routes/flight-status-api/routes/openapi';
import hotelPriceRouter from './routes/hotel-price-api/routes/intelligence';
import hotelPriceOpenapiRouter from './routes/hotel-price-api/routes/openapi';
import restaurantSearchRouter from './routes/restaurant-search-api/routes/intelligence';
import restaurantSearchOpenapiRouter from './routes/restaurant-search-api/routes/openapi';
import mapsPlacesRouter from './routes/maps-places-api/routes/intelligence';
import mapsPlacesOpenapiRouter from './routes/maps-places-api/routes/openapi';
import eventSearchRouter from './routes/event-search-api/routes/intelligence';
import eventSearchOpenapiRouter from './routes/event-search-api/routes/openapi';
import sportsScoresRouter from './routes/sports-scores-api/routes/intelligence';
import sportsScoresOpenapiRouter from './routes/sports-scores-api/routes/openapi';
import bettingOddsRouter from './routes/betting-odds-api/routes/intelligence';
import bettingOddsOpenapiRouter from './routes/betting-odds-api/routes/openapi';
import socialProfileLookupRouter from './routes/social-profile-lookup-api/routes/intelligence';
import socialProfileLookupOpenapiRouter from './routes/social-profile-lookup-api/routes/openapi';
import twitterPostLookupRouter from './routes/twitter-post-lookup-api/routes/intelligence';
import twitterPostLookupOpenapiRouter from './routes/twitter-post-lookup-api/routes/openapi';
import youtubeMetadataRouter from './routes/youtube-metadata-api/routes/intelligence';
import youtubeMetadataOpenapiRouter from './routes/youtube-metadata-api/routes/openapi';
import tiktokMetadataRouter from './routes/tiktok-metadata-api/routes/intelligence';
import tiktokMetadataOpenapiRouter from './routes/tiktok-metadata-api/routes/openapi';
import podcastSearchRouter from './routes/podcast-search-api/routes/intelligence';
import podcastSearchOpenapiRouter from './routes/podcast-search-api/routes/openapi';
import transcriptExtractionRouter from './routes/transcript-extraction-api/routes/intelligence';
import transcriptExtractionOpenapiRouter from './routes/transcript-extraction-api/routes/openapi';
import audioTranscriptionRouter from './routes/audio-transcription-api/routes/intelligence';
import audioTranscriptionOpenapiRouter from './routes/audio-transcription-api/routes/openapi';
import textSummarizerApiRouter from './routes/text-summarizer-api/routes/intelligence';
import textSummarizerApiOpenapiRouter from './routes/text-summarizer-api/routes/openapi';
import languageDetectionRouter from './routes/language-detection-api/routes/intelligence';
import languageDetectionOpenapiRouter from './routes/language-detection-api/routes/openapi';
import translationRouter from './routes/translation-api/routes/intelligence';
import translationOpenapiRouter from './routes/translation-api/routes/openapi';
import sentimentRouter from './routes/sentiment-api/routes/intelligence';
import sentimentOpenapiRouter from './routes/sentiment-api/routes/openapi';
import entityExtractionRouter from './routes/entity-extraction-api/routes/intelligence';
import entityExtractionOpenapiRouter from './routes/entity-extraction-api/routes/openapi';
import contentModerationRouter from './routes/content-moderation-api/routes/intelligence';
import contentModerationOpenapiRouter from './routes/content-moderation-api/routes/openapi';
import piiDetectionRouter from './routes/pii-detection-api/routes/intelligence';
import piiDetectionOpenapiRouter from './routes/pii-detection-api/routes/openapi';
import emailParserRouter from './routes/email-parser-api/routes/intelligence';
import emailParserOpenapiRouter from './routes/email-parser-api/routes/openapi';
import invoiceParserRouter from './routes/invoice-parser-api/routes/intelligence';
import invoiceParserOpenapiRouter from './routes/invoice-parser-api/routes/openapi';
import receiptParserRouter from './routes/receipt-parser-api/routes/intelligence';
import receiptParserOpenapiRouter from './routes/receipt-parser-api/routes/openapi';
import contractClauseRouter from './routes/contract-clause-api/routes/intelligence';
import contractClauseOpenapiRouter from './routes/contract-clause-api/routes/openapi';
import legalCitationRouter from './routes/legal-citation-api/routes/intelligence';
import legalCitationOpenapiRouter from './routes/legal-citation-api/routes/openapi';
import tableExtractionRouter from './routes/table-extraction-api/routes/intelligence';
import tableExtractionOpenapiRouter from './routes/table-extraction-api/routes/openapi';
import signatureDetectionRouter from './routes/signature-detection-api/routes/intelligence';
import signatureDetectionOpenapiRouter from './routes/signature-detection-api/routes/openapi';
import documentClassificationRouter from './routes/document-classification-api/routes/intelligence';
import documentClassificationOpenapiRouter from './routes/document-classification-api/routes/openapi';
import pdfGeneratorRouter from './routes/pdf-generator-api/routes/intelligence';
import pdfGeneratorOpenapiRouter from './routes/pdf-generator-api/routes/openapi';
import githubIssueSearchRouter from './routes/github-issue-search-api/routes/intelligence';
import githubIssueSearchOpenapiRouter from './routes/github-issue-search-api/routes/openapi';
import jsonSchemaValidatorRouter from './routes/json-schema-validator-api/routes/intelligence';
import jsonSchemaValidatorOpenapiRouter from './routes/json-schema-validator-api/routes/openapi';
import apiHealthCheckRouter from './routes/api-health-check-api/routes/intelligence';
import apiHealthCheckOpenapiRouter from './routes/api-health-check-api/routes/openapi';
import sslCertificateRouter from './routes/ssl-certificate-api/routes/intelligence';
import sslCertificateOpenapiRouter from './routes/ssl-certificate-api/routes/openapi';
import dnsLookupRouter from './routes/dns-lookup-api/routes/intelligence';
import dnsLookupOpenapiRouter from './routes/dns-lookup-api/routes/openapi';
import cveLookupRouter from './routes/cve-lookup-api/routes/intelligence';
import cveLookupOpenapiRouter from './routes/cve-lookup-api/routes/openapi';
import npmPackageRiskRouter from './routes/npm-package-risk-api/routes/intelligence';
import npmPackageRiskOpenapiRouter from './routes/npm-package-risk-api/routes/openapi';
import imageResizeRouter from './routes/image-resize-api/routes/intelligence';
import imageResizeOpenapiRouter from './routes/image-resize-api/routes/openapi';
import backgroundRemovalRouter from './routes/background-removal-api/routes/intelligence';
import backgroundRemovalOpenapiRouter from './routes/background-removal-api/routes/openapi';
import colorPaletteRouter from './routes/color-palette-api/routes/intelligence';
import colorPaletteOpenapiRouter from './routes/color-palette-api/routes/openapi';
import shortLinkRouter from './routes/short-link-api/routes/intelligence';
import shortLinkOpenapiRouter from './routes/short-link-api/routes/openapi';
import memeCaptionRouter from './routes/meme-caption-api/routes/intelligence';
import memeCaptionOpenapiRouter from './routes/meme-caption-api/routes/openapi';
import crmContactIntelligenceRouter from './routes/crm-contact-intelligence-api/routes/intelligence';
import crmContactIntelligenceOpenapiRouter from './routes/crm-contact-intelligence-api/routes/openapi';
import founderBackgroundRouter from './routes/founder-background-api/routes/intelligence';
import founderBackgroundOpenapiRouter from './routes/founder-background-api/routes/openapi';
import executiveRiskRouter from './routes/executive-risk-api/routes/intelligence';
import executiveRiskOpenapiRouter from './routes/executive-risk-api/routes/openapi';
import decisionMakerFitRouter from './routes/decision-maker-fit-api/routes/intelligence';
import decisionMakerFitOpenapiRouter from './routes/decision-maker-fit-api/routes/openapi';
import htmlToMarkdownRouter from './routes/html-to-markdown-api/routes/intelligence';
import htmlToMarkdownOpenapiRouter from './routes/html-to-markdown-api/routes/openapi';
import markdownCleanerRouter from './routes/markdown-cleaner-api/routes/intelligence';
import markdownCleanerOpenapiRouter from './routes/markdown-cleaner-api/routes/openapi';
import urlMetadataApiRouter from './routes/url-metadata-api/routes/intelligence';
import urlMetadataApiOpenapiRouter from './routes/url-metadata-api/routes/openapi';
import insiderTradesRouter from './routes/insider-trades-api/routes/intelligence';
import insiderTradesOpenapiRouter from './routes/insider-trades-api/routes/openapi';
import etfHoldingsRouter from './routes/etf-holdings-api/routes/intelligence';
import etfHoldingsOpenapiRouter from './routes/etf-holdings-api/routes/openapi';
import walletBalanceApiRouter from './routes/wallet-balance-api/routes/intelligence';
import walletBalanceApiOpenapiRouter from './routes/wallet-balance-api/routes/openapi';
import gasFeeRouter from './routes/gas-fee-api/routes/intelligence';
import gasFeeOpenapiRouter from './routes/gas-fee-api/routes/openapi';
import tokenMetadataRouter from './routes/token-metadata-api/routes/intelligence';
import tokenMetadataOpenapiRouter from './routes/token-metadata-api/routes/openapi';
import blockchainTxLookupRouter from './routes/blockchain-tx-lookup-api/routes/intelligence';
import blockchainTxLookupOpenapiRouter from './routes/blockchain-tx-lookup-api/routes/openapi';
import defiPoolDataRouter from './routes/defi-pool-data-api/routes/intelligence';
import defiPoolDataOpenapiRouter from './routes/defi-pool-data-api/routes/openapi';
import tokenRiskLiteRouter from './routes/token-risk-lite-api/routes/intelligence';
import tokenRiskLiteOpenapiRouter from './routes/token-risk-lite-api/routes/openapi';
import onchainLabelingRouter from './routes/onchain-labeling-api/routes/intelligence';
import onchainLabelingOpenapiRouter from './routes/onchain-labeling-api/routes/openapi';
import smartContractDecoderRouter from './routes/smart-contract-decoder-api/routes/intelligence';
import smartContractDecoderOpenapiRouter from './routes/smart-contract-decoder-api/routes/openapi';
import thumbnailAnalysisRouter from './routes/thumbnail-analysis-api/routes/intelligence';
import thumbnailAnalysisOpenapiRouter from './routes/thumbnail-analysis-api/routes/openapi';
import trendVelocityRouter from './routes/trend-velocity-api/routes/intelligence';
import trendVelocityOpenapiRouter from './routes/trend-velocity-api/routes/openapi';
import viralityScoreRouter from './routes/virality-score-api/routes/intelligence';
import viralityScoreOpenapiRouter from './routes/virality-score-api/routes/openapi';
import metaTagsExtractorRouter from './routes/meta-tags-extractor-api/routes/intelligence';
import metaTagsExtractorOpenapiRouter from './routes/meta-tags-extractor-api/routes/openapi';
import openGraphPreviewRouter from './routes/open-graph-preview-api/routes/intelligence';
import openGraphPreviewOpenapiRouter from './routes/open-graph-preview-api/routes/openapi';
import appStoreLookupRouter from './routes/app-store-lookup-api/routes/intelligence';
import appStoreLookupOpenapiRouter from './routes/app-store-lookup-api/routes/openapi';
import chromeExtensionLookupRouter from './routes/chrome-extension-lookup-api/routes/intelligence';
import chromeExtensionLookupOpenapiRouter from './routes/chrome-extension-lookup-api/routes/openapi';
import browserCompatibilityRouter from './routes/browser-compatibility-api/routes/intelligence';
import browserCompatibilityOpenapiRouter from './routes/browser-compatibility-api/routes/openapi';
import dnsPropagationRouter from './routes/dns-propagation-api/routes/intelligence';
import dnsPropagationOpenapiRouter from './routes/dns-propagation-api/routes/openapi';
import sslExpiryMonitorRouter from './routes/ssl-expiry-monitor-api/routes/intelligence';
import sslExpiryMonitorOpenapiRouter from './routes/ssl-expiry-monitor-api/routes/openapi';
import tlsConfigurationRouter from './routes/tls-configuration-api/routes/intelligence';
import tlsConfigurationOpenapiRouter from './routes/tls-configuration-api/routes/openapi';
import websiteCarbonFootprintRouter from './routes/website-carbon-footprint-api/routes/intelligence';
import websiteCarbonFootprintOpenapiRouter from './routes/website-carbon-footprint-api/routes/openapi';
import accessibilityAuditLiteRouter from './routes/accessibility-audit-lite-api/routes/intelligence';
import accessibilityAuditLiteOpenapiRouter from './routes/accessibility-audit-lite-api/routes/openapi';
import keywordDensityRouter from './routes/keyword-density-api/routes/intelligence';
import keywordDensityOpenapiRouter from './routes/keyword-density-api/routes/openapi';
import serpSnippetPreviewRouter from './routes/serp-snippet-preview-api/routes/intelligence';
import serpSnippetPreviewOpenapiRouter from './routes/serp-snippet-preview-api/routes/openapi';
import slugGeneratorRouter from './routes/slug-generator-api/routes/intelligence';
import slugGeneratorOpenapiRouter from './routes/slug-generator-api/routes/openapi';
import textReadabilityScoreRouter from './routes/text-readability-score-api/routes/intelligence';
import textReadabilityScoreOpenapiRouter from './routes/text-readability-score-api/routes/openapi';
import grammarCheckLiteRouter from './routes/grammar-check-lite-api/routes/intelligence';
import grammarCheckLiteOpenapiRouter from './routes/grammar-check-lite-api/routes/openapi';
import emojiSentimentRouter from './routes/emoji-sentiment-api/routes/intelligence';
import emojiSentimentOpenapiRouter from './routes/emoji-sentiment-api/routes/openapi';
import hashtagGeneratorRouter from './routes/hashtag-generator-api/routes/intelligence';
import hashtagGeneratorOpenapiRouter from './routes/hashtag-generator-api/routes/openapi';
import captionGeneratorRouter from './routes/caption-generator-api/routes/intelligence';
import captionGeneratorOpenapiRouter from './routes/caption-generator-api/routes/openapi';
import ctaGeneratorRouter from './routes/cta-generator-api/routes/intelligence';
import ctaGeneratorOpenapiRouter from './routes/cta-generator-api/routes/openapi';
import subjectLineScorerRouter from './routes/subject-line-scorer-api/routes/intelligence';
import subjectLineScorerOpenapiRouter from './routes/subject-line-scorer-api/routes/openapi';
import httpHeaderInspectorRouter from './routes/http-header-inspector-api/routes/intelligence';
import httpHeaderInspectorOpenapiRouter from './routes/http-header-inspector-api/routes/openapi';
import cookieScannerRouter from './routes/cookie-scanner-api/routes/intelligence';
import cookieScannerOpenapiRouter from './routes/cookie-scanner-api/routes/openapi';
import cspAnalyzerRouter from './routes/csp-analyzer-api/routes/intelligence';
import cspAnalyzerOpenapiRouter from './routes/csp-analyzer-api/routes/openapi';
import redirectChainAnalyzerRouter from './routes/redirect-chain-analyzer-api/routes/intelligence';
import redirectChainAnalyzerOpenapiRouter from './routes/redirect-chain-analyzer-api/routes/openapi';
import canonicalUrlCheckerRouter from './routes/canonical-url-checker-api/routes/intelligence';
import canonicalUrlCheckerOpenapiRouter from './routes/canonical-url-checker-api/routes/openapi';
import brokenLinkCheckerRouter from './routes/broken-link-checker-api/routes/intelligence';
import brokenLinkCheckerOpenapiRouter from './routes/broken-link-checker-api/routes/openapi';
import robotsTxtParserRouter from './routes/robots-txt-parser-api/routes/intelligence';
import robotsTxtParserOpenapiRouter from './routes/robots-txt-parser-api/routes/openapi';
import domainAgeRouter from './routes/domain-age-api/routes/intelligence';
import domainAgeOpenapiRouter from './routes/domain-age-api/routes/openapi';
import domainAvailabilityRouter from './routes/domain-availability-api/routes/intelligence';
import domainAvailabilityOpenapiRouter from './routes/domain-availability-api/routes/openapi';
import mxRecordCheckerRouter from './routes/mx-record-checker-api/routes/intelligence';
import mxRecordCheckerOpenapiRouter from './routes/mx-record-checker-api/routes/openapi';
import spfDkimDmarcCheckerRouter from './routes/spf-dkim-dmarc-checker-api/routes/intelligence';
import spfDkimDmarcCheckerOpenapiRouter from './routes/spf-dkim-dmarc-checker-api/routes/openapi';
import sitemapParserRouter from './routes/sitemap-parser-api/routes/intelligence';
import sitemapParserOpenapiRouter from './routes/sitemap-parser-api/routes/openapi';
import hreflangValidatorRouter from './routes/hreflang-validator-api/routes/intelligence';
import hreflangValidatorOpenapiRouter from './routes/hreflang-validator-api/routes/openapi';
import websiteTechStackDetectorRouter from './routes/website-tech-stack-detector-api/routes/intelligence';
import websiteTechStackDetectorOpenapiRouter from './routes/website-tech-stack-detector-api/routes/openapi';
import cdnDetectorRouter from './routes/cdn-detector-api/routes/intelligence';
import cdnDetectorOpenapiRouter from './routes/cdn-detector-api/routes/openapi';
import hostingProviderDetectorRouter from './routes/hosting-provider-detector-api/routes/intelligence';
import hostingProviderDetectorOpenapiRouter from './routes/hosting-provider-detector-api/routes/openapi';
import whoisLiteRouter from './routes/whois-lite-api/routes/intelligence';
import whoisLiteOpenapiRouter from './routes/whois-lite-api/routes/openapi';
import internalLinkAnalyzerRouter from './routes/internal-link-analyzer-api/routes/intelligence';
import internalLinkAnalyzerOpenapiRouter from './routes/internal-link-analyzer-api/routes/openapi';
import externalLinkAuditorRouter from './routes/external-link-auditor-api/routes/intelligence';
import externalLinkAuditorOpenapiRouter from './routes/external-link-auditor-api/routes/openapi';
import pageTitleOptimizerRouter from './routes/page-title-optimizer-api/routes/intelligence';
import pageTitleOptimizerOpenapiRouter from './routes/page-title-optimizer-api/routes/openapi';
import schemaOrgExtractorRouter from './routes/schema-org-extractor-api/routes/intelligence';
import schemaOrgExtractorOpenapiRouter from './routes/schema-org-extractor-api/routes/openapi';
import faqSchemaValidatorRouter from './routes/faq-schema-validator-api/routes/intelligence';
import faqSchemaValidatorOpenapiRouter from './routes/faq-schema-validator-api/routes/openapi';
import breadcrumbValidatorRouter from './routes/breadcrumb-validator-api/routes/intelligence';
import breadcrumbValidatorOpenapiRouter from './routes/breadcrumb-validator-api/routes/openapi';
import sitemapHealthScoreRouter from './routes/sitemap-health-score-api/routes/intelligence';
import sitemapHealthScoreOpenapiRouter from './routes/sitemap-health-score-api/routes/openapi';
import indexabilityCheckerRouter from './routes/indexability-checker-api/routes/intelligence';
import indexabilityCheckerOpenapiRouter from './routes/indexability-checker-api/routes/openapi';
import mobileSeoAuditRouter from './routes/mobile-seo-audit-api/routes/intelligence';
import mobileSeoAuditOpenapiRouter from './routes/mobile-seo-audit-api/routes/openapi';
import coreWebVitalsLiteRouter from './routes/core-web-vitals-lite-api/routes/intelligence';
import coreWebVitalsLiteOpenapiRouter from './routes/core-web-vitals-lite-api/routes/openapi';
import duplicateContentDetectorRouter from './routes/duplicate-content-detector-api/routes/intelligence';
import duplicateContentDetectorOpenapiRouter from './routes/duplicate-content-detector-api/routes/openapi';
import urlStructureScorerRouter from './routes/url-structure-scorer-api/routes/intelligence';
import urlStructureScorerOpenapiRouter from './routes/url-structure-scorer-api/routes/openapi';
import featuredSnippetPredictorRouter from './routes/featured-snippet-predictor-api/routes/intelligence';
import featuredSnippetPredictorOpenapiRouter from './routes/featured-snippet-predictor-api/routes/openapi';
import ctrPredictionRouter from './routes/ctr-prediction-api/routes/intelligence';
import ctrPredictionOpenapiRouter from './routes/ctr-prediction-api/routes/openapi';
import textSimplifierRouter from './routes/text-simplifier-api/routes/intelligence';
import textSimplifierOpenapiRouter from './routes/text-simplifier-api/routes/openapi';
import toneAnalyzerApiRouter from './routes/tone-analyzer-api/routes/intelligence';
import toneAnalyzerApiOpenapiRouter from './routes/tone-analyzer-api/routes/openapi';
import toxicityDetectionRouter from './routes/toxicity-detection-api/routes/intelligence';
import toxicityDetectionOpenapiRouter from './routes/toxicity-detection-api/routes/openapi';
import promptInjectionDetectorRouter from './routes/prompt-injection-detector-api/routes/intelligence';
import promptInjectionDetectorOpenapiRouter from './routes/prompt-injection-detector-api/routes/openapi';
import hallucinationRiskLiteRouter from './routes/hallucination-risk-lite-api/routes/intelligence';
import hallucinationRiskLiteOpenapiRouter from './routes/hallucination-risk-lite-api/routes/openapi';
import citationExtractorRouter from './routes/citation-extractor-api/routes/intelligence';
import citationExtractorOpenapiRouter from './routes/citation-extractor-api/routes/openapi';
import citationFormatterRouter from './routes/citation-formatter-api/routes/intelligence';
import citationFormatterOpenapiRouter from './routes/citation-formatter-api/routes/openapi';
import bulletPointExtractorRouter from './routes/bullet-point-extractor-api/routes/intelligence';
import bulletPointExtractorOpenapiRouter from './routes/bullet-point-extractor-api/routes/openapi';
import keyPhraseExtractorRouter from './routes/key-phrase-extractor-api/routes/intelligence';
import keyPhraseExtractorOpenapiRouter from './routes/key-phrase-extractor-api/routes/openapi';
import faqGeneratorRouter from './routes/faq-generator-api/routes/intelligence';
import faqGeneratorOpenapiRouter from './routes/faq-generator-api/routes/openapi';
import titleGeneratorRouter from './routes/title-generator-api/routes/intelligence';
import titleGeneratorOpenapiRouter from './routes/title-generator-api/routes/openapi';
import adCopyVariantGeneratorRouter from './routes/ad-copy-variant-generator-api/routes/intelligence';
import adCopyVariantGeneratorOpenapiRouter from './routes/ad-copy-variant-generator-api/routes/openapi';
import hookGeneratorRouter from './routes/hook-generator-api/routes/intelligence';
import hookGeneratorOpenapiRouter from './routes/hook-generator-api/routes/openapi';
import youtubeTitleOptimizerRouter from './routes/youtube-title-optimizer-api/routes/intelligence';
import youtubeTitleOptimizerOpenapiRouter from './routes/youtube-title-optimizer-api/routes/openapi';
import linkedinPostOptimizerRouter from './routes/linkedin-post-optimizer-api/routes/intelligence';
import linkedinPostOptimizerOpenapiRouter from './routes/linkedin-post-optimizer-api/routes/openapi';
import tiktokCaptionOptimizerRouter from './routes/tiktok-caption-optimizer-api/routes/intelligence';
import tiktokCaptionOptimizerOpenapiRouter from './routes/tiktok-caption-optimizer-api/routes/openapi';
import thumbnailTextScorerRouter from './routes/thumbnail-text-scorer-api/routes/intelligence';
import thumbnailTextScorerOpenapiRouter from './routes/thumbnail-text-scorer-api/routes/openapi';
import brandVoiceCheckerRouter from './routes/brand-voice-checker-api/routes/intelligence';
import brandVoiceCheckerOpenapiRouter from './routes/brand-voice-checker-api/routes/openapi';
import emailSyntaxValidatorRouter from './routes/email-syntax-validator-api/routes/intelligence';
import emailSyntaxValidatorOpenapiRouter from './routes/email-syntax-validator-api/routes/openapi';
import disposableEmailDetectorRouter from './routes/disposable-email-detector-api/routes/intelligence';
import disposableEmailDetectorOpenapiRouter from './routes/disposable-email-detector-api/routes/openapi';
import emailReputationRouter from './routes/email-reputation-api/routes/intelligence';
import emailReputationOpenapiRouter from './routes/email-reputation-api/routes/openapi';
import companyDomainFinderRouter from './routes/company-domain-finder-api/routes/intelligence';
import companyDomainFinderOpenapiRouter from './routes/company-domain-finder-api/routes/openapi';
import executiveEmailPatternFinderRouter from './routes/executive-email-pattern-finder-api/routes/intelligence';
import executiveEmailPatternFinderOpenapiRouter from './routes/executive-email-pattern-finder-api/routes/openapi';
import emailDeliverabilityScoreRouter from './routes/email-deliverability-score-api/routes/intelligence';
import emailDeliverabilityScoreOpenapiRouter from './routes/email-deliverability-score-api/routes/openapi';
import mailboxProviderDetectorRouter from './routes/mailbox-provider-detector-api/routes/intelligence';
import mailboxProviderDetectorOpenapiRouter from './routes/mailbox-provider-detector-api/routes/openapi';
import contactCardExtractorRouter from './routes/contact-card-extractor-api/routes/intelligence';
import contactCardExtractorOpenapiRouter from './routes/contact-card-extractor-api/routes/openapi';
import meetingInviteParserRouter from './routes/meeting-invite-parser-api/routes/intelligence';
import meetingInviteParserOpenapiRouter from './routes/meeting-invite-parser-api/routes/openapi';
import signatureBlockParserRouter from './routes/signature-block-parser-api/routes/intelligence';
import signatureBlockParserOpenapiRouter from './routes/signature-block-parser-api/routes/openapi';
import urlRiskLiteRouter from './routes/url-risk-lite-api/routes/intelligence';
import urlRiskLiteOpenapiRouter from './routes/url-risk-lite-api/routes/openapi';
import domainReputationRouter from './routes/domain-reputation-api/routes/intelligence';
import domainReputationOpenapiRouter from './routes/domain-reputation-api/routes/openapi';
import phishingKeywordDetectorRouter from './routes/phishing-keyword-detector-api/routes/intelligence';
import phishingKeywordDetectorOpenapiRouter from './routes/phishing-keyword-detector-api/routes/openapi';
import apkRiskLiteRouter from './routes/apk-risk-lite-api/routes/intelligence';
import apkRiskLiteOpenapiRouter from './routes/apk-risk-lite-api/routes/openapi';
import chromeExtensionRiskRouter from './routes/chrome-extension-risk-api/routes/intelligence';
import chromeExtensionRiskOpenapiRouter from './routes/chrome-extension-risk-api/routes/openapi';
import walletAddressRiskRouter from './routes/wallet-address-risk-api/routes/intelligence';
import walletAddressRiskOpenapiRouter from './routes/wallet-address-risk-api/routes/openapi';
import smartContractMetadataRouter from './routes/smart-contract-metadata-api/routes/intelligence';
import smartContractMetadataOpenapiRouter from './routes/smart-contract-metadata-api/routes/openapi';
import smartContractAbiLookupRouter from './routes/smart-contract-abi-lookup-api/routes/intelligence';
import smartContractAbiLookupOpenapiRouter from './routes/smart-contract-abi-lookup-api/routes/openapi';
import transactionDecoderRouter from './routes/transaction-decoder-api/routes/intelligence';
import transactionDecoderOpenapiRouter from './routes/transaction-decoder-api/routes/openapi';
import apiSchemaValidatorRouter from './routes/api-schema-validator-api/routes/intelligence';
import apiSchemaValidatorOpenapiRouter from './routes/api-schema-validator-api/routes/openapi';
import openapiDiffCheckerRouter from './routes/openapi-diff-checker-api/routes/intelligence';
import openapiDiffCheckerOpenapiRouter from './routes/openapi-diff-checker-api/routes/openapi';
import webhookPayloadInspectorRouter from './routes/webhook-payload-inspector-api/routes/intelligence';
import webhookPayloadInspectorOpenapiRouter from './routes/webhook-payload-inspector-api/routes/openapi';
import rateLimitEstimatorRouter from './routes/rate-limit-estimator-api/routes/intelligence';
import rateLimitEstimatorOpenapiRouter from './routes/rate-limit-estimator-api/routes/openapi';
import retryStrategyRecommenderRouter from './routes/retry-strategy-recommender-api/routes/intelligence';
import retryStrategyRecommenderOpenapiRouter from './routes/retry-strategy-recommender-api/routes/openapi';
import cacheTtlRecommenderRouter from './routes/cache-ttl-recommender-api/routes/intelligence';
import cacheTtlRecommenderOpenapiRouter from './routes/cache-ttl-recommender-api/routes/openapi';
import mcpCompatibilityValidatorRouter from './routes/mcp-compatibility-validator-api/routes/intelligence';
import mcpCompatibilityValidatorOpenapiRouter from './routes/mcp-compatibility-validator-api/routes/openapi';
import agentWorkflowValidatorRouter from './routes/agent-workflow-validator-api/routes/intelligence';
import agentWorkflowValidatorOpenapiRouter from './routes/agent-workflow-validator-api/routes/openapi';
import orchestrationDependencyMapperRouter from './routes/orchestration-dependency-mapper-api/routes/intelligence';
import orchestrationDependencyMapperOpenapiRouter from './routes/orchestration-dependency-mapper-api/routes/openapi';

// ─────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────
import { nftWhaleTrackerRouter } from './routes/nft-whale-tracker-api/routes/whales';
import { nftRarityScoreRouter } from './routes/nft-rarity-score-api/routes/rarity';
import { nftMintCalendarRouter } from './routes/nft-mint-calendar-api/routes/calendar';
import { nftSniperAlertRouter } from './routes/nft-sniper-alert-api/routes/sniper';
import { nftVolumeHeatmapRouter } from './routes/nft-volume-heatmap-api/routes/heatmap';
import { nftInfluencerTrackingRouter } from './routes/nft-influencer-tracking-api/routes/influencers';
import { nftArbitrageRouter } from './routes/nft-arbitrage-api/routes/arbitrage';
// OpenAPI back-fill: helper + nft-arbitrage's existing spec router
import { openapiRouterFromRouter } from './shared/openapiFromRouter';
import nftArbitrageOpenapiRouter from './routes/nft-arbitrage-api/routes/openapi';
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────
// O(1) route lookup map — replaces 906 sequential app.use() calls
// ─────────────────────────────────────────────────────────────────
const routerMap: Record<string, import("express").Router> = {
  'agent-web-data-extraction': agent_web_data_extraction_info,
  'market-correlation': market_correlation_info,
  'yield-farming': yield_farming_info,
  'defi-risk': defi_risk_info,
  'liquidation-feed': liquidation_feed_info,
  'token-screener': token_screener_info,
  'cross-chain-bridge': cross_chain_bridge_info,
  'market-stress': market_stress_info,
  'strategy-signal': strategy_signal_info,
  'smart-contract-risk': smart_contract_risk_info,
  'crypto-trigger': crypto_trigger_info,
  'intelligence-extraction': intelligence_extraction_info,
  'career-optimization': career_optimization_info,
  'tx-simulator': tx_simulator_info,
  'outreach-execution': outreach_execution_info,
  'proposal-generation': proposal_generation_info,
  'voice-intelligence': voice_intelligence_info,
  'product-data': product_data_info,
  'agent-observability': agent_observability_info,
  'agent-identity': agent_identity_info,
  'real-time-monitor': real_time_monitor_info,
  'text-generation': text_generation_info,
  'defi-position-risk': defi_position_risk_info,
  'tokenomics': tokenomics_info,
  'derivatives': derivatives_info,
  'derivatives-intelligence': derivatives_intelligence_info,
  'onchain-signal': onchainSignalWhaleRouter,
  'stablecoin-yield': stablecoinYieldDocsRouter,
  'alpha-signal': alphaSignalDocsRouter,
  'wallet': walletBalanceRouter,
  'agent-memory': agentMemoryInfoRouter,
  'ai-output-safety': ai_output_safety_app as any,
  'autopilot': autopilotInfoRouter,
  'browser-task': browserTaskInfoRouter,
  'company-research': companyResearchInfoRouter,
  'crypto-news-impact': newsImpactRouter,
  'dev-utilities': urlMetadataRouter,
  'document-intelligence': document_intelligence_app as any,
  'email-validation': email_validation_app as any,
  'phone-validation': phone_validation_app as any,
  'search-extract': search_extract_app as any,
  'token-trust': token_trust_app as any,
  'trust': trust_app as any,
  'user-risk': user_risk_app as any,
  'wallet-intelligence': wallet_intelligence_app as any,
  'extraction': extractionIntelligenceRouter,
  'resume': resumeRouter,
  'identity-intelligence': identity_intelligence_app as any,
  'image-to-content': image_to_content_app as any,
  'ip-intelligence': ip_intelligence_app as any,
  'lead-discovery': leadsRouter,
  'lead-enrichment': lead_enrichment_app as any,
  'lead-quality': lead_quality_app as any,
  'market-intelligence': marketIntelligenceRouter,
  'market-signal-v2': marketSignalV2Router,
  'market-signal': marketSignalRouter,
  'market-trigger': marketTriggerRouter,
  'market-webhook': marketWebhookInfoRouter,
  'strategy-execution': strategyExecutionRouter,
  'unified-decision': unifiedDecisionRouter,
  'website-monitor': websiteMonitorInfoRouter,
  'social-sentiment': socialSentimentRouter,
  'gas-optimizer': gasOptimizerInfoRouter,
  'funding-rate': fundingRateInfoRouter,
  'prediction-market': predictionMarketInfoRouter,
  'token-unlock': tokenUnlockInfoRouter,
  'crypto-narrative': cryptoNarrativeInfoRouter,
  'crypto-alerts': cryptoAlertsInfoRouter,
  'agent-skills': agentSkillsDocsRouter,
  'defi-position-monitor': defiPositionInfoRouter,
  'wallet-portfolio': walletPortfolioInfoRouter,
  'meta-strategy': metaStrategyInfoRouter,
  'action': actionInfoRouter,
  'agent-workflow': agentWorkflowInfoRouter,
  'portfolio-rebalance': portfolioRebalanceInfoRouter,
  'image-gen': imageGenRouter,
  'text-gen': textGenInfoRouter,
  'geocoding': geocodingInfoRouter,
  'market-snapshot': marketSnapshotRouter,
  'web-scraper': webScraperInfoRouter,
  'youtube-intelligence': youtubeIntelligenceRouter,
  'pdf-extraction': pdfExtractionRouter,
  'email-intelligence': emailIntelligenceRouter,
  'meeting-analyzer': meetingAnalyzerRouter,
  'deep-research': deepResearchRouter,
  'shopify-analyzer': shopifyAnalyzerRouter,
  'serp-intelligence': serpIntelligenceRouter,
  'local-business': localBusinessRouter,
  'competitor-monitor': competitorMonitorRouter,
  'cold-outreach': coldOutreachApiRouter,
  'lead-scoring': leadScoringRouter,
  'workflow-orchestrator': workflowOrchestratorRouter,
  'crm-update': crmUpdateRouter,
  'calendar-scheduling': calendarSchedulingRouter,
  'social-intelligence': socialIntelligenceRouter,
  'data-connector': dataConnectorRouter,
  'agent-eval': agentEvalRouter,
  'computer-use': computerUseRouter,
  'compliance': complianceRouter,
  'agent-payments': agentPaymentsRouter,
  'browser-automation': browserAutomationRouter,
  'enterprise-retrieval': enterpriseRetrievalRouter,
  'multi-agent': multiAgentRouter,
  'web-navigation': webNavigationRouter,
  'context-compression': contextCompressionRouter,
  'fact-verification': factVerificationRouter,
  'earnings-analyzer': earningsAnalyzerRouter,
  'portfolio-risk': portfolioRiskRouter,
  'financial-news-monitor': financialNewsMonitorRouter,
  'legal-contract-risk': legalContractRiskRouter,
  'reddit-intelligence': redditIntelligenceRouter,
  'vendor-ranking': vendorRankingRouter,
  'sec-filing-intelligence': secFilingIntelligenceRouter,
  'economic-calendar': economicCalendarRouter,
  'reputation-intelligence': reputationIntelligenceRouter,
  'supply-chain-risk': supplyChainRiskRouter,
  'autonomous-negotiation': autonomousNegotiationRouter,
  'corporate-actions': corporateActionsRouter,
  'knowledge-graph': knowledgeGraphRouter,
  'risk-event-forecast': riskEventForecastRouter,
  'sales-intelligence': salesIntelligenceRouter,
  'qa-testing': qaTestingRouter,
  'due-diligence': dueDiligenceRouter,
  'linkedin-profile': linkedinProfileRouter,
  'company-enrichment': companyEnrichmentApiRouter,
  'email-finder': emailFinderRouter,
  'stock-quote': stockQuoteRouter,
  'image-ocr': imageOcrRouter,
  'website-screenshot': websiteScreenshotRouter,
  'job-posting-search': jobPostingSearchRouter,
  'github-repo-stats': githubRepoStatsRouter,
  'openapi-validator': openapiValidatorRouter,
  'address-risk': addressRiskRouter,
  'domain-intelligence': domainIntelligenceApiRouter,
  'web-page-extractor': webPageExtractorRouter,
  'news-search': newsSearchRouter,
  'crypto-price': cryptoPriceRouter,
  'fear-greed': fearGreedRouter,
  'stablecoin-depeg': stablecoinDepegRouter,
  'top-movers': topMoversRouter,
// crypto-risk-suite routers
  'liquidation-cascade': liquidationCascadeRouter,
  'funding-rate-divergence': fundingRateDivergenceRouter,
  'open-interest-intelligence': openInterestIntelligenceRouter,
  'orderbook-imbalance': orderbookImbalanceRouter,
  'stop-hunt-detection': stopHuntDetectionRouter,
  'ai-risk-manager': aiRiskManagerRouter,
  'position-sizing': positionSizingRouter,
  'ai-portfolio-hedging': aiPortfolioHedgingRouter,
  'trade-execution-timing': tradeExecutionTimingRouter,
  'smart-money-rotation': smartMoneyRotationRouter,
  'yield-farming-optimizer': yieldFarmingOptimizerRouter,
  'impermanent-loss': impermanentLossRouter,
  'nft-floor-price': nftFloorPriceRouter,
  'staking-rewards': stakingRewardsRouter,
  'whale-wallet-tracker': whaleWalletTrackerRouter,
  'smart-money-flow': smartMoneyFlowRouter,
  'meme-coin-intelligence': memeCoinIntelligenceRouter,
  'cross-exchange-arbitrage': crossExchangeArbitrageRouter,
  'market-dominance': marketDominanceRouter,
  'token-holder-distribution': tokenHolderDistributionRouter,
  'lending-rates': lendingRatesRouter,
  'borrowing-rates': borrowingRatesRouter,
  'tvl-analytics': tvlAnalyticsRouter,
  'honeypot-scanner': honeypotScannerRouter,
  'ai-due-diligence': aiDueDiligenceRouter,
  'ip-subnet-calculator': ipSubnetCalculatorRouter,
  'uuid-ulid-generator': uuidUlidRouter,
  'color-contrast-evaluator': colorContrastRouter,
  'geo-coordinate-calculator': geoCoordinateRouter,
  'timezone-harmonizer': timezoneHarmonizerRouter,
  'nft-collection-analytics': nftCollectionAnalyticsRouter,
  'ai-trade-confidence': aiTradeConfidenceRouter,
  'ohlcv-candlestick': ohlcvCandlestickRouter,
  'multi-exchange-ticker': multiExchangeTickerRouter,
  'breakout-detection': breakoutDetectionRouter,
  'rsi-signal': rsiSignalRouter,
  'macd-signal': macdSignalRouter,
  'bollinger-band': bollingerBandRouter,
  'whale-entry-signal': whaleEntrySignalRouter,
  'scalping-opportunity': scalpingOpportunityRouter,
  'dex-cex-arbitrage': dexCexArbitrageRouter,
  'triangular-arbitrage': triangularArbitrageRouter,
  'stablecoin-arbitrage': stablecoinArbitrageRouter,
  'cross-chain-arbitrage': crossChainArbitrageRouter,
  'gas-adjusted-arbitrage': gasAdjustedArbitrageRouter,
  'flash-loan-opportunity': flashLoanOpportunityRouter,
  'market-inefficiency-scanner': marketInefficiencyScannerRouter,
  'smart-wallet-discovery': smartWalletDiscoveryRouter,
  'wallet-copy-trading': walletCopyTradingRouter,
  'insider-wallet-detection': insiderWalletDetectionRouter,
  'dormant-wallet-awakening': dormantWalletAwakeningRouter,
  'whale-transaction': whaleTransactionRouter,
  'validator-activity': validatorActivityRouter,
  'cross-chain-liquidity': crossChainLiquidityRouter,
  'fx-rates': fxRatesRouter,
  'weather': weatherRouter,
  'ip-geolocation': ipGeolocationRouter,
  'address-validation': addressValidationApiRouter,
  'logo-finder': logoFinderRouter,
  'favicon': faviconRouter,
  'qr-barcode': qrBarcodeRouter,
  'url-screenshot-diff': urlScreenshotDiffRouter,
  'website-change-monitor': websiteChangeMonitorRouter,
  'price-monitor': priceMonitorRouter,
  'amazon-product': amazonProductRouter,
  'resume-parser': resumeParserRouter,
  'ats-keyword': atsKeywordRouter,
  'calendar-holiday': calendarHolidayRouter,
  'timezone': timezoneRouter,
  'currency-formatting': currencyFormattingRouter,
  'unit-conversion': unitConversionRouter,
  'aes-vault': aesVaultRouter,
  'cron-explainer': cronExplainerRouter,
  'refinance-calculator': refinanceCalculatorRouter,
  'mortgage-refinance': mortgageRefinanceRouter,
  'emergency-fund-calculator': emergencyFundCalculatorRouter,
  'financial-health-checker': financialHealthCheckerRouter,
  'personal-finance-agent': personalFinanceAgentRouter,
  'debt-payoff-planner': debtPayoffPlannerRouter,
  'retirement-planner': retirementPlannerRouter,
  'savings-goal-optimizer': savingsGoalOptimizerRouter,
  'budget-planner': budgetPlannerRouter,
  'net-worth-tracker': netWorthTrackerRouter,
  'credit-score-estimator': creditScoreEstimatorRouter,
  'insurance-needs-calculator': insuranceNeedsCalculatorRouter,
  'loan-affordability-calculator': loanAffordabilityCalculatorRouter,
  'rent-vs-buy-calculator': rentVsBuyCalculatorRouter,
  'dti-calculator': dtiCalculatorRouter,
  'data-validator': dataValidatorRouter,
  'random-data-generator': randomDataGeneratorRouter,
  'web-content-diff-checker': webContentDiffCheckerRouter,
  'web-vitals-grader': webVitalsGraderRouter,
  'web-content-type-classifier': webContentTypeClassifierRouter,
  'web-performance-budget-checker': webPerformanceBudgetCheckerRouter,
  'web-scrape-rate-limiter': webScrapeRateLimiterRouter,
  'web-content-freshness-scorer': webContentFreshnessScorerRouter,
  'web-archive-url-builder': webArchiveUrlBuilderRouter,
  'web-scrape-cost-roi-analyzer': webScrapeCostRoiAnalyzerRouter,
  'webhook-signature-verifier': webhookSignatureVerifierRouter,
  'webhook-reliability-scorer': webhookReliabilityScorerRouter,
  'webhook-validator': webhookValidatorRouter,
  'webhook-payload-builder': webhookPayloadBuilderRouter,
  'json-to-csv': jsonToCsvRouter,
  'tax-rate': taxRateRouter,
  'shipping-rate': shippingRateRouter,
  'package-tracking': packageTrackingRouter,
  'flight-status': flightStatusRouter,
  'hotel-price': hotelPriceRouter,
  'restaurant-search': restaurantSearchRouter,
  'maps-places': mapsPlacesRouter,
  'event-search': eventSearchRouter,
  'sports-scores': sportsScoresRouter,
  'betting-odds': bettingOddsRouter,
  'social-profile-lookup': socialProfileLookupRouter,
  'twitter-post-lookup': twitterPostLookupRouter,
  'youtube-metadata': youtubeMetadataRouter,
  'tiktok-metadata': tiktokMetadataRouter,
  'podcast-search': podcastSearchRouter,
  'transcript-extraction': transcriptExtractionRouter,
  'audio-transcription': audioTranscriptionRouter,
  'text-summarizer': textSummarizerApiRouter,
  'language-detection': languageDetectionRouter,
  'translation': translationRouter,
  'sentiment': sentimentRouter,
  'entity-extraction': entityExtractionRouter,
  'content-moderation': contentModerationRouter,
  'pii-detection': piiDetectionRouter,
  'email-parser': emailParserRouter,
  'invoice-parser': invoiceParserRouter,
  'receipt-parser': receiptParserRouter,
  'contract-clause': contractClauseRouter,
  'legal-citation': legalCitationRouter,
  'table-extraction': tableExtractionRouter,
  'signature-detection': signatureDetectionRouter,
  'document-classification': documentClassificationRouter,
  'pdf-generator': pdfGeneratorRouter,
  'github-issue-search': githubIssueSearchRouter,
  'json-schema-validator': jsonSchemaValidatorRouter,
  'api-health-check': apiHealthCheckRouter,
  'ssl-certificate': sslCertificateRouter,
  'dns-lookup': dnsLookupRouter,
  'cve-lookup': cveLookupRouter,
  'npm-package-risk': npmPackageRiskRouter,
  'image-resize': imageResizeRouter,
  'background-removal': backgroundRemovalRouter,
  'color-palette': colorPaletteRouter,
  'short-link': shortLinkRouter,
  'meme-caption': memeCaptionRouter,
  'crm-contact-intelligence': crmContactIntelligenceRouter,
  'founder-background': founderBackgroundRouter,
  'executive-risk': executiveRiskRouter,
  'decision-maker-fit': decisionMakerFitRouter,
  'html-to-markdown': htmlToMarkdownRouter,
  'markdown-cleaner': markdownCleanerRouter,
  'url-metadata': urlMetadataApiRouter,
  'insider-trades': insiderTradesRouter,
  'etf-holdings': etfHoldingsRouter,
  'wallet-balance': walletBalanceApiRouter,
  'gas-fee': gasFeeRouter,
  'token-metadata': tokenMetadataRouter,
  'blockchain-tx-lookup': blockchainTxLookupRouter,
  'defi-pool-data': defiPoolDataRouter,
  'token-risk-lite': tokenRiskLiteRouter,
  'onchain-labeling': onchainLabelingRouter,
  'smart-contract-decoder': smartContractDecoderRouter,
  'thumbnail-analysis': thumbnailAnalysisRouter,
  'trend-velocity': trendVelocityRouter,
  'virality-score': viralityScoreRouter,
  'meta-tags-extractor': metaTagsExtractorRouter,
  'open-graph-preview': openGraphPreviewRouter,
  'app-store-lookup': appStoreLookupRouter,
  'chrome-extension-lookup': chromeExtensionLookupRouter,
  'browser-compatibility': browserCompatibilityRouter,
  'dns-propagation': dnsPropagationRouter,
  'ssl-expiry-monitor': sslExpiryMonitorRouter,
  'tls-configuration': tlsConfigurationRouter,
  'website-carbon-footprint': websiteCarbonFootprintRouter,
  'accessibility-audit-lite': accessibilityAuditLiteRouter,
  'keyword-density': keywordDensityRouter,
  'serp-snippet-preview': serpSnippetPreviewRouter,
  'slug-generator': slugGeneratorRouter,
  'text-readability-score': textReadabilityScoreRouter,
  'grammar-check-lite': grammarCheckLiteRouter,
  'emoji-sentiment': emojiSentimentRouter,
  'hashtag-generator': hashtagGeneratorRouter,
  'caption-generator': captionGeneratorRouter,
  'cta-generator': ctaGeneratorRouter,
  'subject-line-scorer': subjectLineScorerRouter,
  'http-header-inspector': httpHeaderInspectorRouter,
  'cookie-scanner': cookieScannerRouter,
  'csp-analyzer': cspAnalyzerRouter,
  'redirect-chain-analyzer': redirectChainAnalyzerRouter,
  'canonical-url-checker': canonicalUrlCheckerRouter,
  'broken-link-checker': brokenLinkCheckerRouter,
  'robots-txt-parser': robotsTxtParserRouter,
  'domain-age': domainAgeRouter,
  'domain-availability': domainAvailabilityRouter,
  'mx-record-checker': mxRecordCheckerRouter,
  'spf-dkim-dmarc-checker': spfDkimDmarcCheckerRouter,
  'sitemap-parser': sitemapParserRouter,
  'hreflang-validator': hreflangValidatorRouter,
  'website-tech-stack-detector': websiteTechStackDetectorRouter,
  'website-tech-stack': websiteTechStackDetectorRouter,
  'company-logo': companyLogoRouter,
  'website-speed-lite': websiteSpeedLiteRouter,
  'contract-analyzer': contractAnalyzerAnalyzeRouter,
  'decision-scorer': decisionScorerScoreRouter,
  'ens-resolver': ensResolverEnsRouter,
  'nft-metadata': nftMetadataIndexRouter,
  'onchain-news': onchainNewsNewsRouter,
  'text-extractor': textExtractorExtractRouter,
  'token-price-feed': tokenPriceFeedPriceRouter,
  'unified-ai-completion': unifiedAiCompletionIndexRouter,
  'wallet-reputation': walletReputationReputationRouter,
  'web-researcher': webResearcherResearchRouter,
  'cdn-detector': cdnDetectorRouter,
  'hosting-provider-detector': hostingProviderDetectorRouter,
  'whois-lite': whoisLiteRouter,
  'internal-link-analyzer': internalLinkAnalyzerRouter,
  'external-link-auditor': externalLinkAuditorRouter,
  'page-title-optimizer': pageTitleOptimizerRouter,
  'schema-org-extractor': schemaOrgExtractorRouter,
  'faq-schema-validator': faqSchemaValidatorRouter,
  'breadcrumb-validator': breadcrumbValidatorRouter,
  'sitemap-health-score': sitemapHealthScoreRouter,
  'indexability-checker': indexabilityCheckerRouter,
  'mobile-seo-audit': mobileSeoAuditRouter,
  'core-web-vitals-lite': coreWebVitalsLiteRouter,
  'duplicate-content-detector': duplicateContentDetectorRouter,
  'url-structure-scorer': urlStructureScorerRouter,
  'featured-snippet-predictor': featuredSnippetPredictorRouter,
  'ctr-prediction': ctrPredictionRouter,
  'text-simplifier': textSimplifierRouter,
  'tone-analyzer': toneAnalyzerApiRouter,
  'toxicity-detection': toxicityDetectionRouter,
  'prompt-injection-detector': promptInjectionDetectorRouter,
  'hallucination-risk-lite': hallucinationRiskLiteRouter,
  'citation-extractor': citationExtractorRouter,
  'citation-formatter': citationFormatterRouter,
  'bullet-point-extractor': bulletPointExtractorRouter,
  'key-phrase-extractor': keyPhraseExtractorRouter,
  'faq-generator': faqGeneratorRouter,
  'title-generator': titleGeneratorRouter,
  'ad-copy-variant-generator': adCopyVariantGeneratorRouter,
  'hook-generator': hookGeneratorRouter,
  'youtube-title-optimizer': youtubeTitleOptimizerRouter,
  'linkedin-post-optimizer': linkedinPostOptimizerRouter,
  'tiktok-caption-optimizer': tiktokCaptionOptimizerRouter,
  'thumbnail-text-scorer': thumbnailTextScorerRouter,
  'brand-voice-checker': brandVoiceCheckerRouter,
  'email-syntax-validator': emailSyntaxValidatorRouter,
  'disposable-email-detector': disposableEmailDetectorRouter,
  'email-reputation': emailReputationRouter,
  'company-domain-finder': companyDomainFinderRouter,
  'executive-email-pattern-finder': executiveEmailPatternFinderRouter,
  'email-deliverability-score': emailDeliverabilityScoreRouter,
  'mailbox-provider-detector': mailboxProviderDetectorRouter,
  'contact-card-extractor': contactCardExtractorRouter,
  'meeting-invite-parser': meetingInviteParserRouter,
  'signature-block-parser': signatureBlockParserRouter,
  'url-risk-lite': urlRiskLiteRouter,
  'domain-reputation': domainReputationRouter,
  'phishing-keyword-detector': phishingKeywordDetectorRouter,
  'apk-risk-lite': apkRiskLiteRouter,
  'chrome-extension-risk': chromeExtensionRiskRouter,
  'wallet-address-risk': walletAddressRiskRouter,
  'smart-contract-metadata': smartContractMetadataRouter,
  'smart-contract-abi-lookup': smartContractAbiLookupRouter,
  'transaction-decoder': transactionDecoderRouter,
  'api-schema-validator': apiSchemaValidatorRouter,
  'openapi-diff-checker': openapiDiffCheckerRouter,
  'webhook-payload-inspector': webhookPayloadInspectorRouter,
  'rate-limit-estimator': rateLimitEstimatorRouter,
  'retry-strategy-recommender': retryStrategyRecommenderRouter,
  'cache-ttl-recommender': cacheTtlRecommenderRouter,
  'mcp-compatibility-validator': mcpCompatibilityValidatorRouter,
  'agent-workflow-validator': agentWorkflowValidatorRouter,
  'orchestration-dependency-mapper': orchestrationDependencyMapperRouter,
};

const openapiMap: Record<string, import("express").Router> = {
  // --- OpenAPI back-fill for APIs that lacked a /openapi.json spec route ---
  // Group A: were falling through to their health stub. Group B: were 404ing.
  'contract-analyzer': openapiRouterFromRouter(contractAnalyzerAnalyzeRouter, { slug: 'contract-analyzer', title: 'Agent Smart Contract Risk & Due Diligence API', description: 'Smart contract risk analysis, scoring, vulnerability detection, comparison, monitoring and execution gating for autonomous agents.' }),
  'decision-scorer': openapiRouterFromRouter(decisionScorerScoreRouter, { slug: 'decision-scorer', title: 'Decision Scorer API', description: 'AI-powered decision and risk scoring with pros, cons, risks and recommendations.' }),
  'ens-resolver': openapiRouterFromRouter(ensResolverEnsRouter, { slug: 'ens-resolver', title: 'ENS Resolver API', description: 'Bidirectional ENS resolution: resolve ENS names to addresses and reverse-lookup Ethereum addresses.' }),
  'nft-metadata': openapiRouterFromRouter(nftMetadataIndexRouter, { slug: 'nft-metadata', title: 'NFT Metadata API', description: 'NFT metadata, traits, collection stats, wallet holdings and transfer history via OpenSea.' }),
  'onchain-news': openapiRouterFromRouter(onchainNewsNewsRouter, { slug: 'onchain-news', title: 'Onchain News API', description: 'Real-time crypto news and AI sentiment analysis with market impact scoring.' }),
  'text-extractor': openapiRouterFromRouter(textExtractorExtractRouter, { slug: 'text-extractor', title: 'Text Extractor API', description: 'Extract structured data and named entities from unstructured text.' }),
  'token-price-feed': openapiRouterFromRouter(tokenPriceFeedPriceRouter, { slug: 'token-price-feed', title: 'Token Price Feed API', description: 'Real-time crypto token prices, batch lookups, top tokens by chain and trending tokens.' }),
  'wallet-reputation': openapiRouterFromRouter(walletReputationReputationRouter, { slug: 'wallet-reputation', title: 'Wallet Reputation API', description: 'Score any Ethereum wallet 0-100 from age, history, balance and activity signals.' }),
  'web-researcher': openapiRouterFromRouter(webResearcherResearchRouter, { slug: 'web-researcher', title: 'Web Researcher API', description: 'AI-powered web research returning structured findings, sources and follow-up questions.' }),
  'onchain-signal': openapiRouterFromRouter(onchainSignalWhaleRouter, { slug: 'onchain-signal', title: 'On-Chain Signal API', description: 'Whale movements, smart money flows and on-chain event signals for crypto assets.' }),
  'nft-arbitrage': nftArbitrageOpenapiRouter,
  'nft-whale-tracker': openapiRouterFromRouter(nftWhaleTrackerRouter, { slug: 'nft-whale-tracker', title: 'NFT Whale Tracker API', description: 'Track whale wallet movements, accumulation patterns and sentiment across blue-chip NFT collections.' }),
  'nft-rarity-score': openapiRouterFromRouter(nftRarityScoreRouter, { slug: 'nft-rarity-score', title: 'NFT Rarity Score API', description: 'Trait rarity scoring, percentile ranking and rarity-adjusted valuation for any NFT.' }),
  'nft-mint-calendar': openapiRouterFromRouter(nftMintCalendarRouter, { slug: 'nft-mint-calendar', title: 'NFT Mint Calendar API', description: 'Upcoming NFT mints with hype scoring, sellout probability and risk assessment.' }),
  'nft-sniper-alert': openapiRouterFromRouter(nftSniperAlertRouter, { slug: 'nft-sniper-alert', title: 'NFT Sniper Alert API', description: 'Detect below-floor NFT listings and instant flip opportunities with urgency scoring.' }),
  'nft-volume-heatmap': openapiRouterFromRouter(nftVolumeHeatmapRouter, { slug: 'nft-volume-heatmap', title: 'NFT Volume Heatmap API', description: 'NFT trading volume heatmaps, volatility analysis and optimal entry timing.' }),
  'nft-influencer-tracking': openapiRouterFromRouter(nftInfluencerTrackingRouter, { slug: 'nft-influencer-tracking', title: 'NFT Influencer Tracking API', description: 'Track NFT influencer purchases, shills, market impact and win-rate history.' }),
  'agent-web-data-extraction': agent_web_data_extraction_docs,
  'market-correlation': market_correlation_docs,
  'yield-farming': yield_farming_docs,
  'defi-risk': defi_risk_docs,
  'liquidation-feed': liquidation_feed_docs,
  'token-screener': token_screener_docs,
  'cross-chain-bridge': cross_chain_bridge_docs,
  'market-stress': market_stress_docs,
  'strategy-signal': strategy_signal_docs,
  'smart-contract-risk': smart_contract_risk_docs,
  'crypto-trigger': crypto_trigger_docs,
  'intelligence-extraction': intelligence_extraction_docs,
  'career-optimization': career_optimization_docs,
  'tx-simulator': tx_simulator_docs,
  'outreach-execution': outreachExecutionOpenapiRouter,
  'proposal-generation': proposalGenerationOpenapiRouter,
  'voice-intelligence': voiceIntelligenceOpenapiRouter,
  'product-data': productDataIntelligenceOpenapiRouter,
  'agent-observability': agentObservabilityOpenapiRouter,
  'agent-identity': agent_identity_docs,
  'real-time-monitor': realTimeMonitorOpenapiRouter,
  'text-generation': text_generation_docs,
  'defi-position-risk': defi_position_risk_docs,
  'tokenomics': tokenomics_docs,
  'derivatives': derivatives_docs,
  'derivatives-intelligence': derivatives_intelligence_docs,
  'wallet': walletOpenapiRouter,
  'agent-memory': agentMemoryOpenapiRouter,
  'crypto-news-impact': cryptoNewsImpactOpenapiRouter,
  'image-to-content': imageToContentOpenapiRouter,
  'market-trigger': marketTriggerOpenapiRouter,
  'token-trust': tokenTrustOpenapiRouter,
  'market-webhook': marketWebhookOpenapiRouter,
  'ai-output-safety': aiOutputSafetyOpenapiRouter,
  'company-research': companyResearchOpenapiRouter,
  'phone-validation': phoneValidationIntelligenceOpenapiRouter,
  'resume': resumeOpenapiRouter,
  'extraction': extractionOpenapiRouter,
  'market-intelligence': marketIntelligenceOpenapiRouter,
  'market-signal-v2': marketSignalV2OpenapiRouter,
  'market-signal': marketSignalOpenapiRouter,
  'lead-discovery': leadDiscoveryOpenapiRouter,
  'lead-enrichment': leadEnrichmentOpenapiRouter,
  'lead-quality': leadQualityOpenapiRouter,
  'document-intelligence': documentIntelligenceOpenapiRouter,
  'website-monitor': websiteMonitorOpenapiRouter,
  'identity-intelligence': identityIntelligenceOpenapiRouter,
  'portfolio-rebalance': portfolioRebalanceOpenapiRouter,
  'strategy-execution': strategyExecutionOpenapiRouter,
  'unified-decision': unifiedDecisionOpenapiRouter,
  'dev-utilities': devUtilitiesOpenapiRouter,
  'meta-strategy': metaStrategyDocsRouter,
  'agent-workflow': agentWorkflowOpenapiRouter,
  'text-gen': textGenOpenapiRouter,
  'market-snapshot': marketSnapshotOpenapiRouter,
  'youtube-intelligence': youtubeIntelligenceOpenapiRouter,
  'pdf-extraction': pdfExtractionIntelligenceOpenapiRouter,
  'email-intelligence': emailIntelligenceOpenapiRouter,
  'meeting-analyzer': meetingAnalyzerOpenapiRouter,
  'deep-research': deepResearchOpenapiRouter,
  'shopify-analyzer': shopifyAnalyzerOpenapiRouter,
  'serp-intelligence': serpIntelligenceOpenapiRouter,
  'local-business': localBusinessOpenapiRouter,
  'competitor-monitor': competitorMonitorOpenapiRouter,
  'cold-outreach': coldOutreachApiOpenapiRouter,
  'lead-scoring': leadScoringOpenapiRouter,
  'workflow-orchestrator': workflowOrchestratorOpenapiRouter,
  'crm-update': crmUpdateOpenapiRouter,
  'calendar-scheduling': calendarSchedulingOpenapiRouter,
  'social-intelligence': socialIntelligenceOpenapiRouter,
  'data-connector': dataConnectorOpenapiRouter,
  'agent-eval': agentEvalOpenapiRouter,
  'computer-use': computerUseOpenapiRouter,
  'compliance': complianceOpenapiRouter,
  'agent-payments': agentPaymentsOpenapiRouter,
  'browser-automation': browserAutomationOpenapiRouter,
  'enterprise-retrieval': enterpriseRetrievalOpenapiRouter,
  'multi-agent': multiAgentOpenapiRouter,
  'web-navigation': webNavigationOpenapiRouter,
  'context-compression': contextCompressionOpenapiRouter,
  'fact-verification': factVerificationOpenapiRouter,
  'earnings-analyzer': earningsAnalyzerOpenapiRouter,
  'portfolio-risk': portfolioRiskOpenapiRouter,
  'financial-news-monitor': financialNewsMonitorOpenapiRouter,
  'legal-contract-risk': legalContractRiskOpenapiRouter,
  'reddit-intelligence': redditIntelligenceOpenapiRouter,
  'vendor-ranking': vendorRankingOpenapiRouter,
  'sec-filing-intelligence': secFilingIntelligenceOpenapiRouter,
  'economic-calendar': economicCalendarOpenapiRouter,
  'reputation-intelligence': reputationIntelligenceOpenapiRouter,
  'supply-chain-risk': supplyChainRiskOpenapiRouter,
  'autonomous-negotiation': autonomousNegotiationOpenapiRouter,
  'corporate-actions': corporateActionsOpenapiRouter,
  'knowledge-graph': knowledgeGraphOpenapiRouter,
  'risk-event-forecast': riskEventForecastOpenapiRouter,
  'sales-intelligence': salesIntelligenceOpenapiRouter,
  'qa-testing': qaTestingOpenapiRouter,
  'due-diligence': dueDiligenceOpenapiRouter,
  'linkedin-profile': linkedinProfileOpenapiRouter,
  'company-enrichment': companyEnrichmentApiOpenapiRouter,
  'email-finder': emailFinderOpenapiRouter,
  'stock-quote': stockQuoteOpenapiRouter,
  'image-ocr': imageOcrOpenapiRouter,
  'website-screenshot': websiteScreenshotOpenapiRouter,
  'job-posting-search': jobPostingSearchOpenapiRouter,
  'github-repo-stats': githubRepoStatsOpenapiRouter,
  'openapi-validator': openapiValidatorOpenapiRouter,
  'address-risk': addressRiskOpenapiRouter,
  'domain-intelligence': domainIntelligenceApiOpenapiRouter,
  'web-page-extractor': webPageExtractorOpenapiRouter,
  'news-search': newsSearchOpenapiRouter,
  'crypto-price': cryptoPriceOpenapiRouter,
  'fear-greed': fearGreedOpenapiRouter,
  'stablecoin-depeg': stablecoinDepegOpenapiRouter,
  'top-movers': topMoversOpenapiRouter,
// crypto-risk-suite openapi
  'liquidation-cascade': liquidationCascadeOpenapiRouter,
  'funding-rate-divergence': fundingRateDivergenceOpenapiRouter,
  'open-interest-intelligence': openInterestIntelligenceOpenapiRouter,
  'orderbook-imbalance': orderbookImbalanceOpenapiRouter,
  'stop-hunt-detection': stopHuntDetectionOpenapiRouter,
  'ai-risk-manager': aiRiskManagerOpenapiRouter,
  'position-sizing': positionSizingOpenapiRouter,
  'ai-portfolio-hedging': aiPortfolioHedgingOpenapiRouter,
  'trade-execution-timing': tradeExecutionTimingOpenapiRouter,
  'smart-money-rotation': smartMoneyRotationOpenapiRouter,
  'yield-farming-optimizer': yieldFarmingOptimizerOpenapiRouter,
  'impermanent-loss': impermanentLossOpenapiRouter,
  'nft-floor-price': nftFloorPriceOpenapiRouter,
  'staking-rewards': stakingRewardsOpenapiRouter,
  'whale-wallet-tracker': whaleWalletTrackerOpenapiRouter,
  'smart-money-flow': smartMoneyFlowOpenapiRouter,
  'meme-coin-intelligence': memeCoinIntelligenceOpenapiRouter,
  'cross-exchange-arbitrage': crossExchangeArbitrageOpenapiRouter,
  'market-dominance': marketDominanceOpenapiRouter,
  'token-holder-distribution': tokenHolderDistributionOpenapiRouter,
  'lending-rates': lendingRatesOpenapiRouter,
  'borrowing-rates': borrowingRatesOpenapiRouter,
  'tvl-analytics': tvlAnalyticsOpenapiRouter,
  'honeypot-scanner': honeypotScannerOpenapiRouter,
  'ai-due-diligence': openapiRouterFromRouter(aiDueDiligenceRouter, { slug: 'ai-due-diligence', title: 'AI Due Diligence API', description: 'One-call token investment due diligence: composite investment_score with fundamental, on-chain, liquidity and contract-safety sub-scores, red flags, bull/bear case and confidence.' }),
  'ip-subnet-calculator': ipSubnetCalculatorOpenapiRouter,
  'uuid-ulid-generator': uuidUlidOpenapiRouter,
  'color-contrast-evaluator': colorContrastOpenapiRouter,
  'geo-coordinate-calculator': geoCoordinateOpenapiRouter,
  'timezone-harmonizer': timezoneHarmonizerOpenapiRouter,
  'nft-collection-analytics': nftCollectionAnalyticsOpenapiRouter,
  'ai-trade-confidence': aiTradeConfidenceOpenapiRouter,
  'ohlcv-candlestick': ohlcvCandlestickOpenapiRouter,
  'multi-exchange-ticker': multiExchangeTickerOpenapiRouter,
  'breakout-detection': breakoutDetectionOpenapiRouter,
  'rsi-signal': rsiSignalOpenapiRouter,
  'macd-signal': macdSignalOpenapiRouter,
  'bollinger-band': bollingerBandOpenapiRouter,
  'whale-entry-signal': whaleEntrySignalOpenapiRouter,
  'scalping-opportunity': scalpingOpportunityOpenapiRouter,
  'dex-cex-arbitrage': dexCexArbitrageOpenapiRouter,
  'triangular-arbitrage': triangularArbitrageOpenapiRouter,
  'stablecoin-arbitrage': stablecoinArbitrageOpenapiRouter,
  'cross-chain-arbitrage': crossChainArbitrageOpenapiRouter,
  'gas-adjusted-arbitrage': gasAdjustedArbitrageOpenapiRouter,
  'flash-loan-opportunity': flashLoanOpportunityOpenapiRouter,
  'market-inefficiency-scanner': marketInefficiencyScannerOpenapiRouter,
  'smart-wallet-discovery': smartWalletDiscoveryOpenapiRouter,
  'wallet-copy-trading': walletCopyTradingOpenapiRouter,
  'insider-wallet-detection': insiderWalletDetectionOpenapiRouter,
  'dormant-wallet-awakening': dormantWalletAwakeningOpenapiRouter,
  'whale-transaction': whaleTransactionOpenapiRouter,
  'validator-activity': validatorActivityOpenapiRouter,
  'cross-chain-liquidity': crossChainLiquidityOpenapiRouter,
  'fx-rates': fxRatesOpenapiRouter,
  'weather': weatherOpenapiRouter,
  'geocoding': geocodingIntelligenceOpenapiRouter,
  'ip-geolocation': ipGeolocationOpenapiRouter,
  'address-validation': addressValidationApiOpenapiRouter,
  'logo-finder': logoFinderOpenapiRouter,
  'favicon': faviconOpenapiRouter,
  'qr-barcode': qrBarcodeOpenapiRouter,
  'url-screenshot-diff': urlScreenshotDiffOpenapiRouter,
  'website-change-monitor': websiteChangeMonitorOpenapiRouter,
  'price-monitor': priceMonitorOpenapiRouter,
  'amazon-product': amazonProductOpenapiRouter,
  'resume-parser': resumeParserOpenapiRouter,
  'ats-keyword': atsKeywordOpenapiRouter,
  'calendar-holiday': calendarHolidayOpenapiRouter,
  'timezone': timezoneOpenapiRouter,
  'currency-formatting': currencyFormattingOpenapiRouter,
  'unit-conversion': unitConversionOpenapiRouter,
  'aes-vault': aesVaultOpenapiRouter,
  'cron-explainer': cronExplainerOpenapiRouter,
  'refinance-calculator': refinanceCalculatorOpenapiRouter,
  'mortgage-refinance': mortgageRefinanceOpenapiRouter,
  'emergency-fund-calculator': emergencyFundCalculatorOpenapiRouter,
  'financial-health-checker': financialHealthCheckerOpenapiRouter,
  'personal-finance-agent': personalFinanceAgentOpenapiRouter,
  'debt-payoff-planner': debtPayoffPlannerOpenapiRouter,
  'retirement-planner': retirementPlannerOpenapiRouter,
  'savings-goal-optimizer': savingsGoalOptimizerOpenapiRouter,
  'budget-planner': budgetPlannerOpenapiRouter,
  'net-worth-tracker': netWorthTrackerOpenapiRouter,
  'credit-score-estimator': creditScoreEstimatorOpenapiRouter,
  'insurance-needs-calculator': insuranceNeedsCalculatorOpenapiRouter,
  'loan-affordability-calculator': loanAffordabilityCalculatorOpenapiRouter,
  'rent-vs-buy-calculator': rentVsBuyCalculatorOpenapiRouter,
  'dti-calculator': dtiCalculatorOpenapiRouter,
  'data-validator': dataValidatorOpenapiRouter,
  'random-data-generator': randomDataGeneratorOpenapiRouter,
  'web-content-diff-checker': webContentDiffCheckerOpenapiRouter,
  'web-vitals-grader': webVitalsGraderOpenapiRouter,
  'web-content-type-classifier': webContentTypeClassifierOpenapiRouter,
  'web-performance-budget-checker': webPerformanceBudgetCheckerOpenapiRouter,
  'web-scrape-rate-limiter': webScrapeRateLimiterOpenapiRouter,
  'web-content-freshness-scorer': webContentFreshnessScorerOpenapiRouter,
  'web-archive-url-builder': webArchiveUrlBuilderOpenapiRouter,
  'web-scrape-cost-roi-analyzer': webScrapeCostRoiAnalyzerOpenapiRouter,
  'webhook-signature-verifier': webhookSignatureVerifierOpenapiRouter,
  'webhook-reliability-scorer': webhookReliabilityScorerOpenapiRouter,
  'webhook-validator': webhookValidatorOpenapiRouter,
  'webhook-payload-builder': webhookPayloadBuilderOpenapiRouter,
  'json-to-csv': jsonToCsvOpenapiRouter,
  'tax-rate': taxRateOpenapiRouter,
  'shipping-rate': shippingRateOpenapiRouter,
  'package-tracking': packageTrackingOpenapiRouter,
  'flight-status': flightStatusOpenapiRouter,
  'hotel-price': hotelPriceOpenapiRouter,
  'restaurant-search': restaurantSearchOpenapiRouter,
  'maps-places': mapsPlacesOpenapiRouter,
  'event-search': eventSearchOpenapiRouter,
  'sports-scores': sportsScoresOpenapiRouter,
  'betting-odds': bettingOddsOpenapiRouter,
  'social-profile-lookup': socialProfileLookupOpenapiRouter,
  'twitter-post-lookup': twitterPostLookupOpenapiRouter,
  'youtube-metadata': youtubeMetadataOpenapiRouter,
  'tiktok-metadata': tiktokMetadataOpenapiRouter,
  'podcast-search': podcastSearchOpenapiRouter,
  'transcript-extraction': transcriptExtractionOpenapiRouter,
  'audio-transcription': audioTranscriptionOpenapiRouter,
  'text-summarizer': textSummarizerApiOpenapiRouter,
  'language-detection': languageDetectionOpenapiRouter,
  'translation': translationOpenapiRouter,
  'sentiment': sentimentOpenapiRouter,
  'entity-extraction': entityExtractionOpenapiRouter,
  'content-moderation': contentModerationOpenapiRouter,
  'pii-detection': piiDetectionOpenapiRouter,
  'email-parser': emailParserOpenapiRouter,
  'invoice-parser': invoiceParserOpenapiRouter,
  'receipt-parser': receiptParserOpenapiRouter,
  'contract-clause': contractClauseOpenapiRouter,
  'legal-citation': legalCitationOpenapiRouter,
  'table-extraction': tableExtractionOpenapiRouter,
  'signature-detection': signatureDetectionOpenapiRouter,
  'document-classification': documentClassificationOpenapiRouter,
  'pdf-generator': pdfGeneratorOpenapiRouter,
  'github-issue-search': githubIssueSearchOpenapiRouter,
  'json-schema-validator': jsonSchemaValidatorOpenapiRouter,
  'api-health-check': apiHealthCheckOpenapiRouter,
  'ssl-certificate': sslCertificateOpenapiRouter,
  'dns-lookup': dnsLookupOpenapiRouter,
  'cve-lookup': cveLookupOpenapiRouter,
  'npm-package-risk': npmPackageRiskOpenapiRouter,
  'image-resize': imageResizeOpenapiRouter,
  'background-removal': backgroundRemovalOpenapiRouter,
  'color-palette': colorPaletteOpenapiRouter,
  'short-link': shortLinkOpenapiRouter,
  'meme-caption': memeCaptionOpenapiRouter,
  'crm-contact-intelligence': crmContactIntelligenceOpenapiRouter,
  'founder-background': founderBackgroundOpenapiRouter,
  'executive-risk': executiveRiskOpenapiRouter,
  'decision-maker-fit': decisionMakerFitOpenapiRouter,
  'html-to-markdown': htmlToMarkdownOpenapiRouter,
  'markdown-cleaner': markdownCleanerOpenapiRouter,
  'url-metadata': urlMetadataApiOpenapiRouter,
  'insider-trades': insiderTradesOpenapiRouter,
  'etf-holdings': etfHoldingsOpenapiRouter,
  'wallet-balance': walletBalanceApiOpenapiRouter,
  'gas-fee': gasFeeOpenapiRouter,
  'token-metadata': tokenMetadataOpenapiRouter,
  'blockchain-tx-lookup': blockchainTxLookupOpenapiRouter,
  'defi-pool-data': defiPoolDataOpenapiRouter,
  'token-risk-lite': tokenRiskLiteOpenapiRouter,
  'onchain-labeling': onchainLabelingOpenapiRouter,
  'smart-contract-decoder': smartContractDecoderOpenapiRouter,
  'thumbnail-analysis': thumbnailAnalysisOpenapiRouter,
  'trend-velocity': trendVelocityOpenapiRouter,
  'virality-score': viralityScoreOpenapiRouter,
  'meta-tags-extractor': metaTagsExtractorOpenapiRouter,
  'open-graph-preview': openGraphPreviewOpenapiRouter,
  'app-store-lookup': appStoreLookupOpenapiRouter,
  'chrome-extension-lookup': chromeExtensionLookupOpenapiRouter,
  'browser-compatibility': browserCompatibilityOpenapiRouter,
  'dns-propagation': dnsPropagationOpenapiRouter,
  'ssl-expiry-monitor': sslExpiryMonitorOpenapiRouter,
  'tls-configuration': tlsConfigurationOpenapiRouter,
  'website-carbon-footprint': websiteCarbonFootprintOpenapiRouter,
  'accessibility-audit-lite': accessibilityAuditLiteOpenapiRouter,
  'keyword-density': keywordDensityOpenapiRouter,
  'serp-snippet-preview': serpSnippetPreviewOpenapiRouter,
  'slug-generator': slugGeneratorOpenapiRouter,
  'text-readability-score': textReadabilityScoreOpenapiRouter,
  'grammar-check-lite': grammarCheckLiteOpenapiRouter,
  'emoji-sentiment': emojiSentimentOpenapiRouter,
  'hashtag-generator': hashtagGeneratorOpenapiRouter,
  'caption-generator': captionGeneratorOpenapiRouter,
  'cta-generator': ctaGeneratorOpenapiRouter,
  'subject-line-scorer': subjectLineScorerOpenapiRouter,
  'http-header-inspector': httpHeaderInspectorOpenapiRouter,
  'cookie-scanner': cookieScannerOpenapiRouter,
  'csp-analyzer': cspAnalyzerOpenapiRouter,
  'redirect-chain-analyzer': redirectChainAnalyzerOpenapiRouter,
  'canonical-url-checker': canonicalUrlCheckerOpenapiRouter,
  'broken-link-checker': brokenLinkCheckerOpenapiRouter,
  'robots-txt-parser': robotsTxtParserOpenapiRouter,
  'domain-age': domainAgeOpenapiRouter,
  'domain-availability': domainAvailabilityOpenapiRouter,
  'mx-record-checker': mxRecordCheckerOpenapiRouter,
  'spf-dkim-dmarc-checker': spfDkimDmarcCheckerOpenapiRouter,
  'sitemap-parser': sitemapParserOpenapiRouter,
  'hreflang-validator': hreflangValidatorOpenapiRouter,
  'website-tech-stack-detector': websiteTechStackDetectorOpenapiRouter,
  'website-tech-stack': websiteTechStackDetectorOpenapiRouter,
  'company-logo': companyLogoOpenapiRouter,
  'website-speed-lite': websiteSpeedLiteOpenapiRouter,
  // NOTE: Group A spec routers are registered higher up via openapiRouterFromRouter().
  // The previous entries here pointed at the base routers (which answer '/' with a
  // health stub, not a spec), which is why /openapi.json returned health JSON.
  'unified-ai-completion': openapiRouterFromRouter(unifiedAiCompletionIndexRouter, { slug: 'api/unified-ai', title: 'Unified Multi-Provider Agent Completion API', description: 'Route chat completions across Claude, GPT-4, Gemini, Grok, Mistral and DeepSeek through one OpenAI-compatible endpoint with failover and cost-optimized routing.' }),
  'cdn-detector': cdnDetectorOpenapiRouter,
  'hosting-provider-detector': hostingProviderDetectorOpenapiRouter,
  'whois-lite': whoisLiteOpenapiRouter,
  'internal-link-analyzer': internalLinkAnalyzerOpenapiRouter,
  'external-link-auditor': externalLinkAuditorOpenapiRouter,
  'page-title-optimizer': pageTitleOptimizerOpenapiRouter,
  'schema-org-extractor': schemaOrgExtractorOpenapiRouter,
  'faq-schema-validator': faqSchemaValidatorOpenapiRouter,
  'breadcrumb-validator': breadcrumbValidatorOpenapiRouter,
  'sitemap-health-score': sitemapHealthScoreOpenapiRouter,
  'indexability-checker': indexabilityCheckerOpenapiRouter,
  'mobile-seo-audit': mobileSeoAuditOpenapiRouter,
  'core-web-vitals-lite': coreWebVitalsLiteOpenapiRouter,
  'duplicate-content-detector': duplicateContentDetectorOpenapiRouter,
  'url-structure-scorer': urlStructureScorerOpenapiRouter,
  'featured-snippet-predictor': featuredSnippetPredictorOpenapiRouter,
  'ctr-prediction': ctrPredictionOpenapiRouter,
  'text-simplifier': textSimplifierOpenapiRouter,
  'tone-analyzer': toneAnalyzerApiOpenapiRouter,
  'toxicity-detection': toxicityDetectionOpenapiRouter,
  'prompt-injection-detector': promptInjectionDetectorOpenapiRouter,
  'hallucination-risk-lite': hallucinationRiskLiteOpenapiRouter,
  'citation-extractor': citationExtractorOpenapiRouter,
  'citation-formatter': citationFormatterOpenapiRouter,
  'bullet-point-extractor': bulletPointExtractorOpenapiRouter,
  'key-phrase-extractor': keyPhraseExtractorOpenapiRouter,
  'faq-generator': faqGeneratorOpenapiRouter,
  'title-generator': titleGeneratorOpenapiRouter,
  'ad-copy-variant-generator': adCopyVariantGeneratorOpenapiRouter,
  'hook-generator': hookGeneratorOpenapiRouter,
  'youtube-title-optimizer': youtubeTitleOptimizerOpenapiRouter,
  'linkedin-post-optimizer': linkedinPostOptimizerOpenapiRouter,
  'tiktok-caption-optimizer': tiktokCaptionOptimizerOpenapiRouter,
  'thumbnail-text-scorer': thumbnailTextScorerOpenapiRouter,
  'brand-voice-checker': brandVoiceCheckerOpenapiRouter,
  'email-syntax-validator': emailSyntaxValidatorOpenapiRouter,
  'disposable-email-detector': disposableEmailDetectorOpenapiRouter,
  'email-reputation': emailReputationOpenapiRouter,
  'company-domain-finder': companyDomainFinderOpenapiRouter,
  'executive-email-pattern-finder': executiveEmailPatternFinderOpenapiRouter,
  'email-deliverability-score': emailDeliverabilityScoreOpenapiRouter,
  'mailbox-provider-detector': mailboxProviderDetectorOpenapiRouter,
  'contact-card-extractor': contactCardExtractorOpenapiRouter,
  'meeting-invite-parser': meetingInviteParserOpenapiRouter,
  'signature-block-parser': signatureBlockParserOpenapiRouter,
  'url-risk-lite': urlRiskLiteOpenapiRouter,
  'domain-reputation': domainReputationOpenapiRouter,
  'phishing-keyword-detector': phishingKeywordDetectorOpenapiRouter,
  'apk-risk-lite': apkRiskLiteOpenapiRouter,
  'chrome-extension-risk': chromeExtensionRiskOpenapiRouter,
  'wallet-address-risk': walletAddressRiskOpenapiRouter,
  'smart-contract-metadata': smartContractMetadataOpenapiRouter,
  'smart-contract-abi-lookup': smartContractAbiLookupOpenapiRouter,
  'transaction-decoder': transactionDecoderOpenapiRouter,
  'api-schema-validator': apiSchemaValidatorOpenapiRouter,
  'openapi-diff-checker': openapiDiffCheckerOpenapiRouter,
  'webhook-payload-inspector': webhookPayloadInspectorOpenapiRouter,
  'rate-limit-estimator': rateLimitEstimatorOpenapiRouter,
  'retry-strategy-recommender': retryStrategyRecommenderOpenapiRouter,
  'cache-ttl-recommender': cacheTtlRecommenderOpenapiRouter,
  'mcp-compatibility-validator': mcpCompatibilityValidatorOpenapiRouter,
  'agent-workflow-validator': agentWorkflowValidatorOpenapiRouter,
  'orchestration-dependency-mapper': orchestrationDependencyMapperOpenapiRouter,
};

// Restaurant Agent Commerce suite — register 10 AI-backed APIs into the dispatcher maps.
Object.assign(routerMap, restaurantRouterMap);
Object.assign(openapiMap, restaurantOpenapiMap);


// Route dispatcher — O(1) lookup instead of O(906) chain walk
app.use('/:slug/openapi.json', (req, res, next) => {
  const router = openapiMap[req.params.slug];
  if (router) return router(req, res, next);
  next();
});

app.get('/:slug/info', (req, res, next) => {
  const router = routerMap[req.params.slug];
  if (router) {
    // Delegate to the router's own GET / handler
    req.url = '/info';
    return router(req, res, next);
  }
  next();
});

app.use('/:slug', (req, res, next) => {
  const router = routerMap[req.params.slug];
  if (router) return router(req, res, next);
  next();
});

// Unified AI special route
// Serve a real OpenAPI spec at the URL the marketplace listings advertise.
// Must be registered before the /api/unified-ai catch-all mounts below.
app.use('/api/unified-ai/openapi.json', openapiRouterFromRouter(unified_ai_router, { slug: 'api/unified-ai', title: 'Unified Multi-Provider Agent Completion API', description: 'Route chat completions across Claude, GPT-4, Gemini, Grok, Mistral and DeepSeek through one OpenAI-compatible endpoint with failover and cost-optimized routing.' }));
app.use('/api/unified-ai', unified_ai_docs);
app.use('/api/unified-ai', unified_ai_router);

app.use('/nft-whale-tracker', nftWhaleTrackerRouter);
app.use('/nft-rarity-score', nftRarityScoreRouter);
app.use('/nft-mint-calendar', nftMintCalendarRouter);
app.use('/nft-sniper-alert', nftSniperAlertRouter);
app.use('/nft-volume-heatmap', nftVolumeHeatmapRouter);
app.use('/nft-influencer-tracking', nftInfluencerTrackingRouter);
app.use('/nft-arbitrage', nftArbitrageRouter);
// text-gen: the routerMap entry only serves the info page (GET /text-gen); mount the
// actual generation router so POST /text-gen/generate works (falls through from the
// /:slug dispatcher when the info router has no matching route).
app.use('/text-gen', textGenRouter);
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
app.use('/api/unified-ai', unified_ai_docs);
app.use('/api/unified-ai', unified_ai_router);
