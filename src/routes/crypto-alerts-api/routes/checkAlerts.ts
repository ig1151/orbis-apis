import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../middleware/validate';
import { getAlert, getAlertsBySymbol, getActiveAlerts, triggerAlert } from '../store/alerts';
import { getPrice } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  alertId: Joi.string().optional(),
  symbol: Joi.string().uppercase().optional(),
});

async function generateIntelligentAlert(alert: any, currentPrice: number, priceData: any): Promise<{
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  actionSuggestion: string;
  confidence: number;
}> {
  try {
    const context = `Alert triggered:
Type: ${alert.type}
Symbol: ${alert.symbol}
Threshold: ${alert.condition.threshold}
Current value: ${currentPrice}
24h change: ${priceData.changePercent24h?.toFixed(2)}%
24h high: $${priceData.high24h?.toLocaleString()}
24h low: $${priceData.low24h?.toLocaleString()}
24h volume: $${(priceData.volume24h / 1e9).toFixed(2)}B`;

    const aiPrompt = `You are a crypto market analyst. An alert just triggered. Assess its significance.

${context}

Respond ONLY in this JSON format (no markdown):
{
  "severity": "low|medium|high|critical",
  "reason": "string (1 sentence — why this alert matters right now)",
  "actionSuggestion": "string (1 sentence — what to do next)",
  "confidence": number (0-1, how confident you are in this assessment)
}`;

    const aiResponse = await callAI(aiPrompt);
    const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    return parsed;
  } catch {
    // Fallback if AI fails
    const percentFromThreshold = Math.abs((currentPrice - alert.condition.threshold) / alert.condition.threshold * 100);
    return {
      severity: percentFromThreshold > 10 ? 'high' : percentFromThreshold > 5 ? 'medium' : 'low',
      reason: `${alert.symbol} reached the ${alert.condition.threshold} threshold`,
      actionSuggestion: 'Review position and consider taking action',
      confidence: 0.6,
    };
  }
}

async function evaluateAlert(alert: any): Promise<void> {
  if (alert.triggered || alert.status !== 'active') return;

  const priceData = await getPrice(alert.symbol);
  if (!priceData) return;

  const currentPrice = priceData.price;
  alert.currentValue = currentPrice;

  let shouldTrigger = false;
  let baseMessage = '';

  switch (alert.type) {
    case 'price_above':
      if (currentPrice >= alert.condition.threshold) {
        shouldTrigger = true;
        baseMessage = `${alert.symbol} hit $${currentPrice.toLocaleString()} — above $${alert.condition.threshold.toLocaleString()}`;
      }
      break;
    case 'price_below':
      if (currentPrice <= alert.condition.threshold) {
        shouldTrigger = true;
        baseMessage = `${alert.symbol} hit $${currentPrice.toLocaleString()} — below $${alert.condition.threshold.toLocaleString()}`;
      }
      break;
    case 'price_change_percent':
      if (Math.abs(priceData.changePercent24h) >= alert.condition.threshold) {
        shouldTrigger = true;
        const dir = priceData.changePercent24h > 0 ? '📈' : '📉';
        baseMessage = `${dir} ${alert.symbol} moved ${priceData.changePercent24h.toFixed(2)}% in 24h`;
      }
      break;
  }

  if (shouldTrigger) {
    // Generate intelligent alert
    const intelligence = await generateIntelligentAlert(alert, currentPrice, priceData);
    const fullMessage = `${baseMessage} | Severity: ${intelligence.severity.toUpperCase()} | ${intelligence.reason}`;
    triggerAlert(alert.alertId, currentPrice, fullMessage);

    // Attach intelligence to alert object for response
    alert.intelligence = intelligence;
  }
}

router.get('/', validateQuery(schema), async (req: Request, res: Response): Promise<void> => {
  const alertId = req.query.alertId as string | undefined;
  const symbol = req.query.symbol as string | undefined;

  try {
    let alertsToCheck = alertId
      ? [getAlert(alertId)].filter(Boolean) as any[]
      : symbol
      ? getAlertsBySymbol(symbol)
      : getActiveAlerts().slice(0, 20);

    for (const alert of alertsToCheck) {
      await evaluateAlert(alert);
    }

    // Format response with intelligence data
    const formattedAlerts = alertsToCheck.map(alert => ({
      alertId: alert.alertId,
      type: alert.type,
      symbol: alert.symbol,
      condition: alert.condition,
      currentValue: alert.currentValue,
      triggered: alert.triggered,
      triggeredAt: alert.triggeredAt,
      triggeredValue: alert.triggeredValue,
      status: alert.status,
      message: alert.message,
      // Intelligent alert fields
      severity: alert.intelligence?.severity || null,
      reason: alert.intelligence?.reason || null,
      actionSuggestion: alert.intelligence?.actionSuggestion || null,
      confidence: alert.intelligence?.confidence || null,
      createdAt: alert.createdAt,
      expiresAt: alert.expiresAt,
    }));

    const triggered = formattedAlerts.filter(a => a.triggered);

    logger.info({ count: alertsToCheck.length, triggered: triggered.length, alertId, symbol }, 'alerts checked');
    res.json({
      success: true,
      data: {
        checked: alertsToCheck.length,
        triggered: triggered.length,
        alerts: formattedAlerts,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'check alerts error');
    res.status(500).json({ error: 'Failed to check alerts', details: err.message });
  }
});

export default router;