import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenSecurity } from '../services/goplus';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { LiquidityHealthResult } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'];

const schema = Joi.object({
  contract: Joi.string().required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

function getConcentrationLevel(pct: number | null): LiquidityHealthResult['liquidityConcentration'] {
  if (pct === null) return 'MEDIUM';
  if (pct >= 80) return 'CRITICAL';
  if (pct >= 50) return 'HIGH';
  if (pct >= 20) return 'MEDIUM';
  return 'LOW';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { contract, chain } = req.query as { contract: string; chain: string };

  try {
    const data = await getTokenSecurity(contract, chain);

    if (!data) {
      res.status(404).json({ error: 'Token not found or unsupported chain', contract, chain });
      return;
    }

    const riskFlags: string[] = [];
    let riskScore = 0;

    const lpHolderCount = data.lp_holder_count ? parseInt(data.lp_holder_count) : null;
    const lpTotalSupply = data.lp_total_supply || null;

    let top1LpPercent: number | null = null;
    let lockedLiquidity: boolean | null = null;

    const lpHolders = (data as any).lp_holders as Array<{ percent: string; is_locked: number; tag?: string }> | undefined;
    if (lpHolders && lpHolders.length > 0) {
      top1LpPercent = parseFloat(lpHolders[0].percent) * 100;
      lockedLiquidity = lpHolders.some((h) => h.is_locked === 1);
    }

    if (lpHolderCount !== null && lpHolderCount < 5) {
      riskScore += 25; riskFlags.push(`Only ${lpHolderCount} LP holders — extremely concentrated`);
    } else if (lpHolderCount !== null && lpHolderCount < 20) {
      riskScore += 10; riskFlags.push(`Only ${lpHolderCount} LP holders — concentrated`);
    }

    if (top1LpPercent !== null && top1LpPercent > 80) {
      riskScore += 30; riskFlags.push(`Top LP holder controls ${top1LpPercent.toFixed(1)}% — extreme rug risk`);
    } else if (top1LpPercent !== null && top1LpPercent > 50) {
      riskScore += 20; riskFlags.push(`Top LP holder controls ${top1LpPercent.toFixed(1)}% — high rug risk`);
    }

    if (lockedLiquidity === false) {
      riskScore += 20; riskFlags.push('Liquidity is NOT locked — can be removed anytime');
    } else if (lockedLiquidity === true) {
      riskScore -= 10;
    }

    if (data.is_in_dex === '0') {
      riskScore += 15; riskFlags.push('Token not listed in any DEX — no liquidity');
    }

    riskScore = Math.max(0, Math.min(100, riskScore));
    const liquidityConcentration = getConcentrationLevel(top1LpPercent);

    let rugPullRisk: LiquidityHealthResult['rugPullRisk'] = 'LOW';
    if (riskScore >= 75) rugPullRisk = 'CRITICAL';
    else if (riskScore >= 50) rugPullRisk = 'HIGH';
    else if (riskScore >= 25) rugPullRisk = 'MEDIUM';

    const context = `Token: ${data.token_symbol || contract} on ${chain}
LP holder count: ${lpHolderCount ?? 'unknown'}
Top LP holder: ${top1LpPercent !== null ? top1LpPercent.toFixed(1) + '%' : 'unknown'}
Liquidity locked: ${lockedLiquidity !== null ? lockedLiquidity : 'unknown'}
In DEX: ${data.is_in_dex === '1' ? 'yes' : 'no'}
Risk flags: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'none'}
Risk score: ${riskScore}/100`;

    const aiNarrative = await callAI(
      `You are a DeFi security analyst. Write 2 sentences assessing the liquidity health and rug pull risk for this token. Be direct and specific.\n\n${context}`
    );

    const result: LiquidityHealthResult = {
      contractAddress: contract,
      chain,
      tokenSymbol: data.token_symbol || null,
      lpHolderCount,
      lpTotalSupply,
      lockedLiquidity,
      top1LpPercent,
      liquidityConcentration,
      rugPullRisk,
      riskScore,
      riskFlags,
      aiNarrative,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ contract, chain, riskScore, rugPullRisk }, 'liquidity/health');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, contract, chain }, 'liquidity/health error');
    res.status(500).json({ error: 'Failed to analyze liquidity health', details: err.message });
  }
});

export default router;