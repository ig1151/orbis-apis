import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getStrategySignal } from '../services/strategy';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { MetaScanResult, SymbolResult } from '../types';

const router = Router();

const VALID_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'OP', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'DOGE', 'SUI', 'APT', 'SEI', 'INJ', 'TIA',
  'ATOM', 'DOT', 'NEAR', 'FET',
];

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'SUI'];

const PREDICTION_QUERIES: Record<string, string> = {
  BTC: 'bitcoin price',
  ETH: 'ethereum price',
  SOL: 'solana price',
  ARB: 'arbitrum crypto',
  SUI: 'sui crypto price',
  BNB: 'binance coin crypto',
  OP: 'optimism crypto',
  AVAX: 'avalanche crypto',
  MATIC: 'polygon crypto',
  LINK: 'chainlink crypto',
  UNI: 'uniswap crypto',
  DOGE: 'dogecoin price',
  APT: 'aptos crypto',
  SEI: 'sei network crypto',
  INJ: 'injective crypto',
  TIA: 'celestia crypto',
  ATOM: 'cosmos crypto',
  DOT: 'polkadot crypto',
  NEAR: 'near protocol crypto',
  FET: 'fetch ai crypto',
};

const schema = Joi.object({
  symbols: Joi.string().optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbolsParam = req.query.symbols as string | undefined;
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter((s) => VALID_SYMBOLS.includes(s)).slice(0, 5)
    : DEFAULT_SYMBOLS;

  if (requestedSymbols.length === 0) {
    res.status(400).json({ error: 'No valid symbols provided', validSymbols: VALID_SYMBOLS });
    return;
  }

  try {
    logger.info({ symbols: requestedSymbols }, 'meta scan started');

    const results = await Promise.allSettled(
      requestedSymbols.map((symbol) =>
        getStrategySignal(symbol, PREDICTION_QUERIES[symbol] || symbol.toLowerCase() + ' crypto')
      )
    );

    const symbolResults: SymbolResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' || !result.value) continue;

      const data = result.value;
      symbolResults.push({
        symbol: data.symbol,
        decision: data.decision,
        signalScore: data.signalScore,
        confidence: data.confidence,
        riskLevel: data.riskLevel,
        invalidatedIf: data.invalidatedIf,
        action: data.action,
        reasoning: data.reasoning,
        keyFactors: data.keyFactors || [],
        price: data.signals?.price?.price || null,
        changePercent24h: data.signals?.price?.changePercent24h || null,
        rank: 0,
      });
    }

    if (symbolResults.length === 0) {
      res.status(503).json({ error: 'All strategy API calls failed' });
      return;
    }

    // Rank by absolute signal strength
    symbolResults.sort((a, b) => Math.abs(b.signalScore) - Math.abs(a.signalScore));
    symbolResults.forEach((r, i) => { r.rank = i + 1; });

    const buySignals = symbolResults.filter((r) => r.decision === 'BUY' || r.decision === 'STRONG_BUY');
    const sellSignals = symbolResults.filter((r) => r.decision === 'SELL' || r.decision === 'STRONG_SELL');
    const holdSignals = symbolResults.filter((r) => r.decision === 'HOLD');

    const bestBuy = [...buySignals].sort((a, b) => b.signalScore - a.signalScore)[0] || null;
    const bestSell = [...sellSignals].sort((a, b) => a.signalScore - b.signalScore)[0] || null;
    const topOpportunity = bestBuy || bestSell || symbolResults[0] || null;

    const avgScore = symbolResults.reduce((s, r) => s + r.signalScore, 0) / symbolResults.length;
    const marketBias: MetaScanResult['marketBias'] =
      avgScore >= 30 ? 'RISK_ON' :
      avgScore <= -30 ? 'RISK_OFF' :
      buySignals.length > 0 && sellSignals.length > 0 ? 'MIXED' : 'NEUTRAL';

    const scanSummary = symbolResults.map((r) =>
      `${r.symbol}: ${r.decision} (score ${r.signalScore}, confidence ${r.confidence}, ${r.riskLevel} risk, price ${r.price ? '$' + r.price.toLocaleString() : 'N/A'}) — ${r.keyFactors[0] || 'neutral'}`
    ).join('\n');

    const aiPrompt = `You are a portfolio strategist reviewing multi-symbol crypto signals.

Scan results:
${scanSummary}

Market bias: ${marketBias}
Best buy: ${bestBuy ? `${bestBuy.symbol} (score ${bestBuy.signalScore})` : 'none'}
Best sell: ${bestSell ? `${bestSell.symbol} (score ${bestSell.signalScore})` : 'none'}

Write 3 sentences: (1) overall market environment, (2) most compelling opportunity and why, (3) key risk to watch. Be specific and direct.`;

    const portfolioNarrative = await callAI(aiPrompt);

    const result: MetaScanResult = {
      scannedSymbols: requestedSymbols,
      scannedCount: requestedSymbols.length,
      successCount: symbolResults.length,
      topOpportunity,
      ranked: symbolResults,
      buySignals,
      sellSignals,
      holdSignals,
      marketBias,
      portfolioNarrative,
      bestBuy,
      bestSell,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({
      symbols: requestedSymbols,
      successCount: symbolResults.length,
      marketBias,
      buyCount: buySignals.length,
      sellCount: sellSignals.length,
    }, 'meta scan complete');

    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'meta scan error');
    res.status(500).json({ error: 'Failed to run meta strategy scan', details: err.message });
  }
});

export default router;