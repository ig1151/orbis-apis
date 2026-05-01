import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getAavePosition } from '../services/aave';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { ProtocolScan, RiskLevel } from '../types';

const router = Router();

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

function getRiskLevel(healthFactor: number | null): RiskLevel {
  if (healthFactor === null) return 'SAFE';
  if (healthFactor <= 1) return 'LIQUIDATABLE';
  if (healthFactor <= 1.1) return 'CRITICAL';
  if (healthFactor <= 1.3) return 'RISKY';
  if (healthFactor <= 1.8) return 'MODERATE';
  return 'SAFE';
}

const RISK_ORDER: RiskLevel[] = ['LIQUIDATABLE', 'CRITICAL', 'RISKY', 'MODERATE', 'SAFE'];

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address } = req.query as { address: string };

  try {
    // Scan Aave V3 across major chains
    const chains = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base'];
    const results = await Promise.allSettled(
      chains.map(chain => getAavePosition(address, chain).then(pos => ({ chain, pos })))
    );

    const protocols: ProtocolScan['protocols'] = [];
    let highestRiskLevel: RiskLevel = 'SAFE';
    let highestRiskProtocol: string | null = null;

    for (const result of results) {
      if (result.status === 'rejected') continue;
      const { chain, pos } = result.value;

      const hasPosition = pos !== null;
      const healthFactor = pos?.healthFactor ?? null;
      const riskLevel = getRiskLevel(healthFactor);

      protocols.push({
        protocol: 'aave-v3',
        chain,
        hasPosition,
        healthFactor,
        riskLevel,
        totalCollateralUsd: pos?.totalCollateralUSD ?? 0,
        totalDebtUsd: pos?.totalDebtUSD ?? 0,
      });

      if (hasPosition && RISK_ORDER.indexOf(riskLevel) < RISK_ORDER.indexOf(highestRiskLevel)) {
        highestRiskLevel = riskLevel;
        highestRiskProtocol = `aave-v3 on ${chain}`;
      }
    }

    const activePositions = protocols.filter(p => p.hasPosition);
    const scanSummary = activePositions.length > 0
      ? activePositions.map(p => `${p.protocol} on ${p.chain}: HF ${p.healthFactor?.toFixed(2)}, ${p.riskLevel}, collateral $${p.totalCollateralUsd.toLocaleString()}, debt $${p.totalDebtUsd.toLocaleString()}`).join('\n')
      : 'No active DeFi lending positions found';

    const aiSummary = await callAI(
      `You are a DeFi risk analyst. Summarize this wallet's DeFi lending exposure in 2 sentences. Be direct about any risks.\n\nAddress: ${address}\n${scanSummary}`
    );

    const result: ProtocolScan = {
      address,
      protocols,
      highestRiskProtocol,
      overallRiskLevel: highestRiskLevel,
      aiSummary,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ address, activePositions: activePositions.length, overallRiskLevel: highestRiskLevel }, 'position/scan');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, address }, 'scan error');
    res.status(500).json({ error: 'Failed to scan positions', details: err.message });
  }
});

export default router;
