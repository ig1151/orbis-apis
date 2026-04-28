import axios from 'axios';
import { PortfolioAsset, NewsArticle, MarketContext, NewsContext, PortfolioContext } from '../types';

export async function fetchMarketSignal(asset: string): Promise<MarketContext | null> {
  try {
    const url = process.env.MARKET_SIGNAL_API_URL;
    const response = await axios.get(`${url}/v1/signal/${asset}`, { timeout: 15000 });
    const d = response.data;
    return {
      asset: d.asset,
      decision: d.decision,
      confidence: d.confidence,
      risk: d.risk,
      trend: d.trend,
      momentum: d.momentum,
      factors: d.factors
    };
  } catch (err) {
    logger.warn({ asset }, 'Market signal fetch failed');
    return null;
  }
}

export async function fetchNewsImpact(asset: string, articles: NewsArticle[]): Promise<NewsContext | null> {
  try {
    const url = process.env.NEWS_IMPACT_API_URL;
    const response = await axios.post(`${url}/v1/news-impact`, {
      asset,
      articles
    }, { timeout: 20000 });
    const d = response.data;
    return {
      sentiment: d.sentiment,
      impact_score: d.impact_score,
      action_bias: d.action_bias,
      confidence: d.confidence,
      event_type: d.event_type,
      drivers: d.drivers,
      risk_warning: d.risk_warning
    };
  } catch (err) {
    logger.warn({ asset }, 'News impact fetch failed');
    return null;
  }
}

export async function fetchPortfolioRebalance(
  portfolio: PortfolioAsset[],
  riskTolerance: string
): Promise<PortfolioContext | null> {
  try {
    const url = process.env.PORTFOLIO_REBALANCE_API_URL;
    const response = await axios.post(`${url}/v1/rebalance`, {
      portfolio,
      strategy: 'risk_adjusted',
      risk_tolerance: riskTolerance,
      cash_buffer: 0.05
    }, { timeout: 20000 });
    const d = response.data;
    return {
      health_score: d.portfolio_health?.score ?? 50,
      rebalance_score: d.summary?.rebalance_score ?? 0,
      trigger: d.summary?.trigger ?? false,
      current_allocations: d.current_allocations,
      target_allocations: d.target_allocations,
      actions: d.actions
    };
  } catch (err) {
    logger.warn({}, 'Portfolio rebalance fetch failed');
    return null;
  }
}

import { logger } from '../middleware/logger';
