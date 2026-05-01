import { Router, Request, Response } from 'express';
import { getActiveAlerts, getTriggeredFeed } from '../store/alerts';
import { getMultiplePrices } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeAlerts = getActiveAlerts();
    const recentTriggers = getTriggeredFeed(5);

    // Get prices for most alerted symbols
    const symbols = [...new Set(activeAlerts.map(a => a.symbol))].slice(0, 10);
    const prices = await getMultiplePrices(symbols.length > 0 ? symbols : ['BTC', 'ETH', 'SOL']);

    const marketConditions = Array.from(prices.entries()).map(([symbol, data]) => ({
      symbol,
      price: data.price,
      change24h: data.changePercent24h,
      alertsActive: activeAlerts.filter(a => a.symbol === symbol).length,
    }));

    const context = `Active alerts: ${activeAlerts.length}
Recent triggers: ${recentTriggers.length}
${recentTriggers.map(a => `${a.symbol}: ${a.message}`).join('\n') || 'No recent triggers'}

Market conditions:
${marketConditions.map(m => `${m.symbol}: $${m.price?.toLocaleString()} (${m.change24h?.toFixed(2)}% 24h), ${m.alertsActive} active alerts`).join('\n')}`;

    const aiSummary = await callAI(
      `You are a crypto market analyst. Write 2 sentences summarizing current market alert conditions and what traders should watch.\n\n${context}`
    );

    logger.info({ activeAlerts: activeAlerts.length, recentTriggers: recentTriggers.length }, 'summary');
    res.json({
      success: true,
      data: {
        totalActive: activeAlerts.length,
        totalTriggered: recentTriggers.length,
        recentTriggers,
        marketConditions,
        aiSummary,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'summary error');
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

export default router;
