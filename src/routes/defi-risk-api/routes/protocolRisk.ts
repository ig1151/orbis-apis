import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getProtocolInfo } from '../services/defillama';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { ProtocolRiskResult } from '../types';

const router = Router();

const schema = Joi.object({
  protocol: Joi.string().required(),
});

function getRiskLevel(score: number): ProtocolRiskResult['riskLevel'] {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const protocol = req.query.protocol as string;

  try {
    const info = await getProtocolInfo(protocol.toLowerCase());

    if (!info) {
      res.status(404).json({
        error: `Protocol "${protocol}" not found`,
        hint: 'Use the DeFiLlama slug (e.g. aave-v3, uniswap-v3, curve)',
      });
      return;
    }

    const riskFlags: string[] = [];
    let riskScore = 0;

    // TVL-based risk
    if (info.tvl === null || info.tvl < 1_000_000) {
      riskScore += 20;
      riskFlags.push('TVL below $1M — very low liquidity');
    } else if (info.tvl < 10_000_000) {
      riskScore += 10;
      riskFlags.push('TVL below $10M — limited liquidity');
    }

    // TVL trend risk
    if (info.change_7d !== null && info.change_7d < -20) {
      riskScore += 20;
      riskFlags.push(`TVL dropped ${Math.abs(info.change_7d).toFixed(1)}% in 7 days`);
    } else if (info.change_7d !== null && info.change_7d < -10) {
      riskScore += 10;
      riskFlags.push(`TVL down ${Math.abs(info.change_7d).toFixed(1)}% in 7 days`);
    }

    if (info.change_1m !== null && info.change_1m < -30) {
      riskScore += 15;
      riskFlags.push(`TVL dropped ${Math.abs(info.change_1m).toFixed(1)}% in 30 days`);
    }

    // Audit risk
    if (info.audits === null || info.audits === 0) {
      riskScore += 25;
      riskFlags.push('No audits on record');
    } else if (info.audits < 2) {
      riskScore += 10;
      riskFlags.push('Only 1 audit on record');
    }

    // Chain diversification
    if (info.chains.length === 1) {
      riskScore += 5;
      riskFlags.push('Single-chain protocol — no diversification');
    }

    riskScore = Math.min(100, riskScore);
    const riskLevel = getRiskLevel(riskScore);

    // AI narrative
    const context = `Protocol: ${info.name} (${protocol})
TVL: $${info.tvl ? (info.tvl / 1e6).toFixed(1) + 'M' : 'unknown'}
7d TVL change: ${info.change_7d !== null ? info.change_7d.toFixed(1) + '%' : 'unknown'}
30d TVL change: ${info.change_1m !== null ? info.change_1m.toFixed(1) + '%' : 'unknown'}
Chains: ${info.chains.join(', ') || 'unknown'}
Category: ${info.category || 'unknown'}
Audits: ${info.audits !== null ? info.audits : 'unknown'}
Risk flags: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'none'}
Risk score: ${riskScore}/100 (${riskLevel})`;

    const aiNarrative = await callAI(
      `You are a DeFi risk analyst. Write 2 sentences assessing this protocol's risk level for a user considering depositing funds. Be direct.\n\n${context}`
    );

    const result: ProtocolRiskResult = {
      protocol: info.name,
      tvlUsd: info.tvl,
      tvl7dChange: info.change_7d,
      tvl30dChange: info.change_1m,
      chains: info.chains,
      category: info.category,
      audits: info.audits,
      riskScore,
      riskLevel,
      riskFlags,
      aiNarrative,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ protocol, riskScore, riskLevel }, 'protocol/risk');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, protocol }, 'protocol/risk error');
    res.status(500).json({ error: 'Failed to analyze protocol risk', details: err.message });
  }
});

export default router;
