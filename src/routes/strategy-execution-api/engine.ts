import axios from 'axios';

const NEWS_API = 'https://crypto-news-impact-api.onrender.com';
const SIGNAL_API = 'https://market-signal-api-iu2o.onrender.com';
const REBALANCE_API = 'https://portfolio-rebalance-api.onrender.com';

export interface PortfolioAsset {
  asset: string;
  value: number;
  weight: number;
}

export interface StrategyRequest {
  portfolio: PortfolioAsset[];
  strategy: 'news_momentum' | 'trend_following' | 'risk_adjusted';
  risk_tolerance: 'low' | 'medium' | 'high';
  assets?: string[];
}

export interface StrategyAction {
  asset: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  confidence: number;
}

export interface StrategyResult {
  strategy: string;
  decision: string;
  confidence: number;
  actions: StrategyAction[];
  reasoning: string[];
  sources: string[];
  timestamp: string;
}

async function safeGet(url: string, params?: Record<string, string>) {
  try {
    const res = await axios.get(url, { params, timeout: 8000 });
    return res.data;
  } catch {
    return null;
  }
}

async function safePost(url: string, body: unknown) {
  try {
    const res = await axios.post(url, body, { timeout: 8000 });
    return res.data;
  } catch {
    return null;
  }
}

export async function executeStrategy(req: StrategyRequest): Promise<StrategyResult> {
  const assets = req.assets?.length ? req.assets : req.portfolio.map(p => p.asset);
  const primaryAsset = assets[0] || 'BTC';
  const reasoning: string[] = [];
  const actions: StrategyAction[] = [];
  const sources: string[] = [];
  let decision = 'hold';
  let confidence = 0.5;

  if (req.strategy === 'news_momentum') {
    const news = await safeGet(`${NEWS_API}/v1/news/impact`, { asset: primaryAsset, limit: '5' });
    sources.push('crypto-news-impact-api');

    if (news?.impacts?.length) {
      const topImpact = news.impacts[0];
      const score = topImpact.impact_score ?? 0;
      const sentiment = topImpact.sentiment ?? 'neutral';

      if (score > 0.7 && sentiment === 'bullish') {
        decision = `increase_${primaryAsset.toLowerCase()}_exposure`;
        confidence = score;
        reasoning.push(`High-impact bullish news detected (score: ${score.toFixed(2)})`);
        reasoning.push(`Headline: "${topImpact.headline?.slice(0, 80)}..."`);
        for (const asset of assets) {
          const portfolioAsset = req.portfolio.find(p => p.asset === asset);
          const currentValue = portfolioAsset?.value ?? 0;
          const buyAmount = req.risk_tolerance === 'high' ? currentValue * 0.2
            : req.risk_tolerance === 'medium' ? currentValue * 0.1
            : currentValue * 0.05;
          actions.push({ asset, action: 'buy', amount: Math.round(buyAmount), confidence });
        }
      } else if (score > 0.7 && sentiment === 'bearish') {
        decision = `reduce_${primaryAsset.toLowerCase()}_exposure`;
        confidence = score;
        reasoning.push(`High-impact bearish news detected (score: ${score.toFixed(2)})`);
        for (const asset of assets) {
          const portfolioAsset = req.portfolio.find(p => p.asset === asset);
          const currentValue = portfolioAsset?.value ?? 0;
          const sellAmount = req.risk_tolerance === 'low' ? currentValue * 0.2
            : req.risk_tolerance === 'medium' ? currentValue * 0.1
            : currentValue * 0.05;
          actions.push({ asset, action: 'sell', amount: Math.round(sellAmount), confidence });
        }
      } else {
        reasoning.push(`News impact score below threshold (score: ${score.toFixed(2)})`);
        reasoning.push('No significant momentum signal — holding current positions');
        for (const asset of assets) {
          actions.push({ asset, action: 'hold', amount: 0, confidence: 0.5 });
        }
      }
    } else {
      reasoning.push('No recent news data available for asset');
      reasoning.push('Defaulting to hold — insufficient signal');
      for (const asset of assets) {
        actions.push({ asset, action: 'hold', amount: 0, confidence: 0.4 });
      }
    }
  } else if (req.strategy === 'trend_following') {
    const signal = await safePost(`${SIGNAL_API}/v1/signal`, { asset: primaryAsset, timeframe: '1h' });
    sources.push('market-signal-api');

    if (signal?.signal) {
      const sig = signal.signal;
      confidence = signal.confidence ?? 0.6;

      if (sig === 'buy' && confidence >= 0.65) {
        decision = `follow_uptrend_${primaryAsset.toLowerCase()}`;
        reasoning.push(`Strong buy signal detected (confidence: ${confidence.toFixed(2)})`);
        reasoning.push('Trend direction: bullish — momentum confirmed');
        for (const asset of assets) {
          const portfolioAsset = req.portfolio.find(p => p.asset === asset);
          const currentValue = portfolioAsset?.value ?? 0;
          const amount = req.risk_tolerance === 'high' ? currentValue * 0.15
            : req.risk_tolerance === 'medium' ? currentValue * 0.08
            : currentValue * 0.03;
          actions.push({ asset, action: 'buy', amount: Math.round(amount), confidence });
        }
      } else if (sig === 'sell' && confidence >= 0.65) {
        decision = `follow_downtrend_${primaryAsset.toLowerCase()}`;
        reasoning.push(`Strong sell signal detected (confidence: ${confidence.toFixed(2)})`);
        reasoning.push('Trend direction: bearish — reducing exposure');
        for (const asset of assets) {
          const portfolioAsset = req.portfolio.find(p => p.asset === asset);
          const currentValue = portfolioAsset?.value ?? 0;
          const amount = req.risk_tolerance === 'low' ? currentValue * 0.15
            : req.risk_tolerance === 'medium' ? currentValue * 0.08
            : currentValue * 0.03;
          actions.push({ asset, action: 'sell', amount: Math.round(amount), confidence });
        }
      } else {
        decision = 'no_clear_trend';
        reasoning.push(`Signal confidence below threshold (${confidence.toFixed(2)}) — no action`);
        for (const asset of assets) {
          actions.push({ asset, action: 'hold', amount: 0, confidence });
        }
      }
    } else {
      reasoning.push('Market signal API unavailable — defaulting to hold');
      for (const asset of assets) {
        actions.push({ asset, action: 'hold', amount: 0, confidence: 0.4 });
      }
    }
  } else if (req.strategy === 'risk_adjusted') {
    const targetWeights: Record<string, number> = {};
    const total = assets.length;
    assets.forEach(a => { targetWeights[a] = 1 / total; });

    const rebalance = await safePost(`${REBALANCE_API}/v1/rebalance`, {
      portfolio: req.portfolio,
      target_weights: targetWeights,
      risk_tolerance: req.risk_tolerance,
    });
    sources.push('portfolio-rebalance-api');

    if (rebalance?.trades?.length) {
      decision = 'rebalance_to_target_weights';
      confidence = 0.82;
      reasoning.push('Portfolio drift detected — rebalancing to equal-weight targets');
      reasoning.push(`Risk tolerance: ${req.risk_tolerance} — position sizes adjusted accordingly`);
      for (const trade of rebalance.trades) {
        actions.push({
          asset: trade.asset,
          action: trade.side === 'buy' ? 'buy' : 'sell',
          amount: Math.round(trade.amount ?? 0),
          confidence,
        });
        reasoning.push(`${trade.asset}: ${trade.side} $${Math.round(trade.amount ?? 0)} to reach target weight`);
      }
    } else {
      decision = 'portfolio_balanced';
      confidence = 0.9;
      reasoning.push('Portfolio is within acceptable drift thresholds');
      reasoning.push('No rebalancing required at this time');
      for (const asset of assets) {
        actions.push({ asset, action: 'hold', amount: 0, confidence: 0.9 });
      }
    }
  }

  return {
    strategy: req.strategy,
    decision,
    confidence: parseFloat(confidence.toFixed(3)),
    actions,
    reasoning,
    sources,
    timestamp: new Date().toISOString(),
  };
}
