import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getAavePosition } from '../services/aave';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid('ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche').default('ethereum'),
  protocol: Joi.string().valid('aave-v3').default('aave-v3'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address, chain, protocol } = req.query as { address: string; chain: string; protocol: string };

  try {
    const position = await getAavePosition(address, chain);

    if (!position) {
      res.json({
        success: true,
        data: {
          address,
          chain,
          protocol,
          alertLevel: 'NONE',
          message: 'No active position found — no liquidation risk',
          analyzedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const hf = position.healthFactor;
    const alertLevel =
      hf <= 1 ? 'EMERGENCY' :
      hf <= 1.1 ? 'CRITICAL' :
      hf <= 1.3 ? 'WARNING' :
      hf <= 1.8 ? 'WATCH' : 'SAFE';

    const liquidationPriceDropPercent = position.totalDebtUSD > 0
      ? Math.round((1 - 1 / hf) * 100)
      : null;

    const context = `Protocol: ${protocol} on ${chain}
Health Factor: ${hf} (${alertLevel})
Total Collateral: $${position.totalCollateralUSD.toLocaleString()}
Total Debt: $${position.totalDebtUSD.toLocaleString()}
Current LTV: ${position.ltv}%
Liquidation Threshold: ${position.currentLiquidationThreshold}%
Collateral drop until liquidation: ${liquidationPriceDropPercent}%
Collaterals: ${position.collaterals.map(c => `${c.symbol}: $${parseFloat(c.underlyingBalanceUSD).toFixed(0)}`).join(', ')}
Debts: ${position.borrows.map(b => `${b.symbol}: $${parseFloat(b.currentTotalDebtUSD).toFixed(0)} at ${b.variableBorrowRate}% APR`).join(', ')}`;

    const aiPrompt = `You are a DeFi risk analyst providing an urgent liquidation risk alert.

${context}

Respond ONLY in this JSON format (no markdown):
{
  "summary": "string (1 sentence — current risk status)",
  "immediateAction": "string (1 sentence — most important thing to do right now)",
  "optionsToReduce Risk": ["string", "string"],
  "timeEstimate": "string (e.g. 'Position safe for weeks at current prices' or 'At risk within hours if ETH drops 5%')"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { summary: aiResponse.slice(0, 200), immediateAction: '', optionsToReduceRisk: [], timeEstimate: '' };
    }

    logger.info({ address, chain, protocol, alertLevel, healthFactor: hf }, 'position/alert');
    res.json({
      success: true,
      data: {
        address,
        chain,
        protocol,
        alertLevel,
        healthFactor: hf,
        liquidationPriceDropPercent,
        totalCollateralUsd: position.totalCollateralUSD,
        totalDebtUsd: position.totalDebtUSD,
        ltv: position.ltv,
        liquidationThreshold: position.currentLiquidationThreshold,
        summary: parsed.summary,
        immediateAction: parsed.immediateAction,
        optionsToReduceRisk: parsed['optionsToReduce Risk'] || parsed.optionsToReduceRisk || [],
        timeEstimate: parsed.timeEstimate,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, address, chain }, 'alert error');
    res.status(500).json({ error: 'Failed to generate position alert', details: err.message });
  }
});

export default router;
