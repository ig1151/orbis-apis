import { UnifiedDecisionClient } from './clients/unifiedDecision';
import { MarketSignalClient } from './clients/marketSignal';
import { NewsImpactClient } from './clients/newsImpact';
import { PortfolioRebalanceClient } from './clients/portfolioRebalance';
import { MarketTriggerClient } from './clients/marketTrigger';
import { StrategyExecutionClient } from './clients/strategyExecution';
import {
  CryptoAgentConfig,
  DecideOptions,
  NewsImpactOptions,
  RebalanceOptions,
  TriggerOptions,
  ExecuteStrategyOptions,
  StrategyResult,
  BacktestResult,
  StrategyDefinition,
} from './types';

export * from './types';

const DEFAULT_URLS = {
  unifiedDecision: 'https://unified-decision-api.onrender.com',
  marketSignal: 'https://market-signal-api-iu2o.onrender.com',
  newsImpact: 'https://crypto-news-impact-api.onrender.com',
  portfolioRebalance: 'https://portfolio-rebalance-api.onrender.com',
  marketTrigger: 'https://market-trigger-api.onrender.com',
  strategyExecution: 'https://strategy-execution-api.onrender.com',
};

export class CryptoAgent {
  private decisionClient: UnifiedDecisionClient;
  private signalClient: MarketSignalClient;
  private newsClient: NewsImpactClient;
  private rebalanceClient: PortfolioRebalanceClient;
  private triggerClient: MarketTriggerClient;
  private strategyClient: StrategyExecutionClient;

  constructor(config: CryptoAgentConfig = {}) {
    const urls = { ...DEFAULT_URLS, ...config.baseUrls };
    const timeout = config.timeout ?? 30000;

    this.decisionClient = new UnifiedDecisionClient(urls.unifiedDecision, timeout);
    this.signalClient = new MarketSignalClient(urls.marketSignal, timeout);
    this.newsClient = new NewsImpactClient(urls.newsImpact, timeout);
    this.rebalanceClient = new PortfolioRebalanceClient(urls.portfolioRebalance, timeout);
    this.triggerClient = new MarketTriggerClient(urls.marketTrigger, timeout);
    this.strategyClient = new StrategyExecutionClient(urls.strategyExecution, timeout);
  }

  // --- Existing methods ---
  async decide(options: DecideOptions): Promise<unknown> {
    return this.decisionClient.decide(options);
  }

  async signal(ticker: string): Promise<unknown> {
    return this.signalClient.signal(ticker);
  }

  async batchSignal(assets: string[]): Promise<unknown> {
    return this.signalClient.batchSignal(assets);
  }

  async newsImpact(options: NewsImpactOptions): Promise<unknown> {
    return this.newsClient.analyze(options);
  }

  async rebalance(options: RebalanceOptions): Promise<unknown> {
    return this.rebalanceClient.rebalance(options);
  }

  async strategies(): Promise<unknown> {
    return this.rebalanceClient.strategies();
  }

  async trigger(options: TriggerOptions): Promise<unknown> {
    return this.triggerClient.evaluate(options);
  }

  // --- Strategy Execution (new in v2) ---
  async executeStrategy(options: ExecuteStrategyOptions): Promise<StrategyResult> {
    return this.strategyClient.execute(options);
  }

  async backtestStrategy(options: ExecuteStrategyOptions): Promise<BacktestResult> {
    return this.strategyClient.backtest(options);
  }

  async listStrategies(): Promise<{ strategies: StrategyDefinition[]; count: number }> {
    return this.strategyClient.list();
  }
}

export default CryptoAgent;
