import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenSecurity } from '../services/goplus';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { PortfolioScanResult } from '../types';

const router = Router();

const schema = Joi.object({
  contracts: Joi.string().required(),
  chain: Joi.string().valid('ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana').default('ethereum'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { contracts, chain } = req.query as { contracts: string; chain: string };

  const isSolana = chain === 'solana';
  const contractList = contracts.split(',').map((c) => c.trim()).slice(0, 5);

  try {
    const positions: PortfolioScanResult['positions'] = [];
    let totalRiskScore = 0;

    for (const contract of contractList) {
      // Validate address format per chain
      if (!isSolana && !contract.match(/^0x[a-fA-F0-9]{40}$/)) continue;
      if (isSolana && contract.length < 32) continue;

      const data = await getTokenSecurity(contract, chain);
      if (!data) {
        positions.push({ contractAddress: contract, tokenSymbol: null, riskScore: 50, riskLevel: 'MEDIUM', topFlag: 'Unable to fetch data' });
        totalRiskScore += 50;
        continue;
      }

      let riskScore = 0;
      const flags: string[] = [];

      if (data.is_honeypot === '1') { riskScore += 40; flags.push('HONEYPOT'); }
      if (data.is_mintable === '1') { riskScore += 20; flags.push('MINTABLE'); }
      if (data.selfdestruct === '1') { riskScore += 15; flags.push('SELF-DESTRUCT'); }
      if (data.hidden_owner === '1') { riskScore += 15; flags.push('HIDDEN OWNER'); }
      if (data.is_blacklisted === '1') { riskScore += 10; flags.push('BLACKLIST'); }
      if (data.sell_tax && parseFloat(data.sell_tax) > 10) { riskScore += 15; flags.push(`SELL TAX ${parseFloat(data.sell_tax).toFixed(0)}%`); }

      riskScore = Math.min(100, riskScore);
      let riskLevel = 'LOW';
      if (riskScore >= 75) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 25) riskLevel = 'MEDIUM';

      positions.push({
        contractAddress: contract,
        tokenSymbol: data.token_symbol || null,
        riskScore,
        riskLevel,
        topFlag: flags[0] || null,
      });
      totalRiskScore += riskScore;
    }

    const aggregateRiskScore = positions.length > 0 ? Math.round(totalRiskScore / positions.length) : 0;
    let aggregateRiskLevel: PortfolioScanResult['aggregateRiskLevel'] = 'LOW';
    if (aggregateRiskScore >= 75) aggregateRiskLevel = 'CRITICAL';
    else if (aggregateRiskScore >= 50) aggregateRiskLevel = 'HIGH';
    else if (aggregateRiskScore >= 25) aggregateRiskLevel = 'MEDIUM';

    const summary = positions.map((p) =>
      `${p.tokenSymbol || p.contractAddress.slice(0, 8)}: ${p.riskLevel} (${p.riskScore}/100)${p.topFlag ? ' — ' + p.topFlag : ''}`
    ).join('\n');

    const aiSummary = await callAI(
      `You are a DeFi portfolio risk analyst. Write 2 sentences summarizing the overall risk of this portfolio and which position is most concerning.\n\nPortfolio on ${chain}:\n${summary}\nAggregate risk: ${aggregateRiskScore}/100 (${aggregateRiskLevel})`
    );

    const result: PortfolioScanResult = {
      totalPositions: contractList.length,
      scanned: positions.length,
      aggregateRiskScore,
      aggregateRiskLevel,
      positions,
      aiSummary,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ chain, scanned: positions.length, aggregateRiskScore }, 'portfolio/scan');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'portfolio/scan error');
    res.status(500).json({ error: 'Failed to scan portfolio', details: err.message });
  }
});

export default router;