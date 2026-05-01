import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getAavePosition } from '../services/aave';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { AavePosition, RiskLevel } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'];

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

function getRiskLevel(healthFactor: number): RiskLevel {
  if (healthFactor <= 1) return 'LIQUIDATABLE';
  if (healthFactor <= 1.1) return 'CRITICAL';
  if (healthFactor <= 1.3) return 'RISKY';
  if (healthFactor <= 1.8) return 'MODERATE';
  return 'SAFE';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address, chain } = req.query as { address: string; chain: string };

  try {
    const position = await getAavePosition(address, chain);

    if (!position) {
      res.json({
        success: true,
        data: {
          address,
          chain,
          protocol: 'aave-v3',
          hasPosition: false,
          message: 'No active Aave V3 position found for this address',
          analyzedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const riskLevel = getRiskLevel(position.healthFactor);
    const netWorthUsd = position.totalCollateralUSD - position.totalDebtUSD;

    // Calculate liquidation price drop %
    let liquidationPriceDropPercent: number | null = null;
    if (position.healthFactor < 999 && position.totalDebtUSD > 0) {
      // How much collateral needs to drop for HF to reach 1.0
      liquidationPriceDropPercent = Math.round((1 - 1 / position.healthFactor) * 100);
    }

    // AI alert for risky positions
    let aiAlert: string | null = null;
    if (riskLevel === 'CRITICAL' || riskLevel === 'LIQUIDATABLE' || riskLevel === 'RISKY') {
      const context = `Aave V3 position on ${chain}:
Health Factor: ${position.healthFactor}
Risk Level: ${riskLevel}
Total Collateral: $${position.totalCollateralUSD.toLocaleString()}
Total Debt: $${position.totalDebtUSD.toLocaleString()}
LTV: ${position.ltv}% (liquidation threshold: ${position.currentLiquidationThreshold}%)
Collateral drop needed for liquidation: ${liquidationPriceDropPercent}%
Collaterals: ${position.collaterals.map(c => `${c.symbol} $${parseFloat(c.underlyingBalanceUSD).toFixed(0)}`).join(', ')}
Debts: ${position.borrows.map(b => `${b.symbol} $${parseFloat(b.currentTotalDebtUSD).toFixed(0)} at ${b.variableBorrowRate}%`).join(', ')}`;

      aiAlert = await callAI(
        `You are a DeFi risk analyst. Write 2 urgent sentences: (1) exactly how close this position is to liquidation, (2) the single most important action to take right now.\n\n${context}`
      );
    }

    const result: AavePosition = {
      address,
      chain,
      protocol: 'aave-v3',
      healthFactor: position.healthFactor,
      totalCollateralUsd: position.totalCollateralUSD,
      totalDebtUsd: position.totalDebtUSD,
      availableBorrowsUsd: position.availableBorrowsUSD,
      ltv: position.ltv,
      maxLtv: position.currentLiquidationThreshold,
      netWorthUsd,
      collaterals: position.collaterals.map(c => ({
        symbol: c.symbol,
        amount: parseFloat(c.underlyingBalance),
        valueUsd: parseFloat(c.underlyingBalanceUSD),
        isCollateral: c.usageAsCollateralEnabledOnUser,
      })),
      debts: position.borrows.map(b => ({
        symbol: b.symbol,
        amount: parseFloat(b.currentTotalDebt),
        valueUsd: parseFloat(b.currentTotalDebtUSD),
        borrowRate: parseFloat(b.variableBorrowRate),
      })),
      riskLevel,
      liquidationPriceDropPercent,
      aiAlert,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ address, chain, healthFactor: position.healthFactor, riskLevel }, 'position/aave');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, address, chain }, 'aave position error');
    res.status(500).json({ error: 'Failed to fetch Aave position', details: err.message });
  }
});

export default router;
