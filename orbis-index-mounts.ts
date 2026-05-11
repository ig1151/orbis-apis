// ── PASTE IMPORTS at top of src/index.ts ──
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

// ── PASTE MOUNTS after existing app.use() blocks ──
app.use('/agent-web-data-extraction/openapi.json', agent_web_data_extraction_docs);
app.use('/agent-web-data-extraction',              agent_web_data_extraction_info);
app.use('/agent-web-data-extraction',              agent_web_data_extraction_router);

app.use('/market-correlation/openapi.json', market_correlation_docs);
app.use('/market-correlation',              market_correlation_info);
app.use('/market-correlation',              market_correlation_router);

app.use('/yield-farming/openapi.json', yield_farming_docs);
app.use('/yield-farming',              yield_farming_info);
app.use('/yield-farming',              yield_farming_router);

app.use('/defi-risk/openapi.json', defi_risk_docs);
app.use('/defi-risk',              defi_risk_info);
app.use('/defi-risk',              defi_risk_router);

app.use('/liquidation-feed/openapi.json', liquidation_feed_docs);
app.use('/liquidation-feed',              liquidation_feed_info);
app.use('/liquidation-feed',              liquidation_feed_router);

app.use('/token-screener/openapi.json', token_screener_docs);
app.use('/token-screener',              token_screener_info);
app.use('/token-screener',              token_screener_router);

app.use('/cross-chain-bridge/openapi.json', cross_chain_bridge_docs);
app.use('/cross-chain-bridge',              cross_chain_bridge_info);
app.use('/cross-chain-bridge',              cross_chain_bridge_router);

app.use('/market-stress/openapi.json', market_stress_docs);
app.use('/market-stress',              market_stress_info);
app.use('/market-stress',              market_stress_router);

app.use('/strategy-signal/openapi.json', strategy_signal_docs);
app.use('/strategy-signal',              strategy_signal_info);
app.use('/strategy-signal',              strategy_signal_router);

app.use('/smart-contract-risk/openapi.json', smart_contract_risk_docs);
app.use('/smart-contract-risk',              smart_contract_risk_info);
app.use('/smart-contract-risk',              smart_contract_risk_router);

app.use('/crypto-trigger/openapi.json', crypto_trigger_docs);
app.use('/crypto-trigger',              crypto_trigger_info);
app.use('/crypto-trigger',              crypto_trigger_router);

app.use('/intelligence-extraction/openapi.json', intelligence_extraction_docs);
app.use('/intelligence-extraction',              intelligence_extraction_info);
app.use('/intelligence-extraction',              intelligence_extraction_router);

app.use('/career-optimization/openapi.json', career_optimization_docs);
app.use('/career-optimization',              career_optimization_info);
app.use('/career-optimization',              career_optimization_router);

app.use('/tx-simulator/openapi.json', tx_simulator_docs);
app.use('/tx-simulator',              tx_simulator_info);
app.use('/tx-simulator',              tx_simulator_router);

app.use('/outreach-execution/openapi.json', outreach_execution_docs);
app.use('/outreach-execution',              outreach_execution_info);
app.use('/outreach-execution',              outreach_execution_router);

app.use('/proposal-generation/openapi.json', proposal_generation_docs);
app.use('/proposal-generation',              proposal_generation_info);
app.use('/proposal-generation',              proposal_generation_router);

app.use('/voice-intelligence/openapi.json', voice_intelligence_docs);
app.use('/voice-intelligence',              voice_intelligence_info);
app.use('/voice-intelligence',              voice_intelligence_router);

app.use('/product-data/openapi.json', product_data_docs);
app.use('/product-data',              product_data_info);
app.use('/product-data',              product_data_router);

app.use('/agent-observability/openapi.json', agent_observability_docs);
app.use('/agent-observability',              agent_observability_info);
app.use('/agent-observability',              agent_observability_router);

app.use('/agent-identity/openapi.json', agent_identity_docs);
app.use('/agent-identity',              agent_identity_info);
app.use('/agent-identity',              agent_identity_router);

app.use('/real-time-monitor/openapi.json', real_time_monitor_docs);
app.use('/real-time-monitor',              real_time_monitor_info);
app.use('/real-time-monitor',              real_time_monitor_router);

app.use('/text-generation/openapi.json', text_generation_docs);
app.use('/text-generation',              text_generation_info);
app.use('/text-generation',              text_generation_router);

app.use('/defi-position-risk/openapi.json', defi_position_risk_docs);
app.use('/defi-position-risk',              defi_position_risk_info);
app.use('/defi-position-risk',              defi_position_risk_router);

app.use('/tokenomics/openapi.json', tokenomics_docs);
app.use('/tokenomics',              tokenomics_info);
app.use('/tokenomics',              tokenomics_router);

app.use('/derivatives/openapi.json', derivatives_docs);
app.use('/derivatives',              derivatives_info);
app.use('/derivatives',              derivatives_router);

app.use('/derivatives-intelligence/openapi.json', derivatives_intelligence_docs);
app.use('/derivatives-intelligence',              derivatives_intelligence_info);
app.use('/derivatives-intelligence',              derivatives_intelligence_router);
