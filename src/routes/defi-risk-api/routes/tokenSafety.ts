import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenSecurity } from '../services/goplus';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { TokenSafetyResult } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'];

const schema = Joi.object({
  contract: Joi.string().required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

function getRiskLevel(score: number): TokenSafetyResult['riskLevel'] {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
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

    const isHoneypot = data.is_honeypot === '1';
    const canMint = data.is_mintable === '1';
    const canBlacklist = data.is_blacklisted === '1';
    const isProxy = data.is_proxy === '1';
    const isSelfDestruct = data.selfdestruct === '1';
    const buyTax = data.buy_tax ? parseFloat(data.buy_tax) : null;
    const sellTax = data.sell_tax ? parseFloat(data.sell_tax) : null;
    const ownerPercent = data.owner_percent ? parseFloat(data.owner_percent) * 100 : null;
    const creatorPercent = data.creator_percent ? parseFloat(data.creator_percent) * 100 : null;
    const top10HolderPercent = data.top_10_holder_rate ? parseFloat(data.top_10_holder_rate) * 100 : null;

    if (isHoneypot) { riskScore += 40; riskFlags.push('HONEYPOT DETECTED — cannot sell token'); }
    if (canMint) { riskScore += 20; riskFlags.push('Mintable — owner can inflate supply'); }
    if (isSelfDestruct) { riskScore += 15; riskFlags.push('Self-destruct function — contract can be wiped'); }
    if (canBlacklist) { riskScore += 10; riskFlags.push('Blacklist function — owner can block wallets'); }
    if (isProxy) { riskScore += 10; riskFlags.push('Proxy contract — logic can be changed'); }
    if (data.hidden_owner === '1') { riskScore += 15; riskFlags.push('Hidden owner — true owner is concealed'); }
    if (data.transfer_pausable === '1') { riskScore += 10; riskFlags.push('Transfers can be paused by owner'); }
    if (sellTax !== null && sellTax > 10) { riskScore += 15; riskFlags.push(`High sell tax: ${sellTax}%`); }
    if (buyTax !== null && buyTax > 10) { riskScore += 10; riskFlags.push(`High buy tax: ${buyTax}%`); }
    if (ownerPercent !== null && ownerPercent > 5) { riskScore += 10; riskFlags.push(`Owner holds ${ownerPercent.toFixed(1)}% of supply`); }
    if (top10HolderPercent !== null && top10HolderPercent > 80) { riskScore += 10; riskFlags.push(`Top 10 holders own ${top10HolderPercent.toFixed(1)}% of supply`); }

    riskScore = Math.min(100, riskScore);
    const riskLevel = getRiskLevel(riskScore);

    const context = `Token: ${data.token_name || 'Unknown'} (${data.token_symbol || '?'}) on ${chain}
Contract: ${contract}
Risk flags: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'none'}
Honeypot: ${isHoneypot}
Mintable: ${canMint}
Buy tax: ${buyTax !== null ? buyTax + '%' : 'unknown'}
Sell tax: ${sellTax !== null ? sellTax + '%' : 'unknown'}
Owner concentration: ${ownerPercent !== null ? ownerPercent.toFixed(1) + '%' : 'unknown'}
Top 10 holders: ${top10HolderPercent !== null ? top10HolderPercent.toFixed(1) + '%' : 'unknown'}
Risk score: ${riskScore}/100 (${riskLevel})`;

    const aiNarrative = await callAI(
      `You are a DeFi security analyst. Write 2 sentences assessing this token's safety for a trader considering buying it. Be direct about the risks.\n\n${context}`
    );

    const result: TokenSafetyResult = {
      contractAddress: contract,
      chain,
      tokenName: data.token_name || null,
      tokenSymbol: data.token_symbol || null,
      isHoneypot,
      honeypotReason: isHoneypot ? (data.other_potential_risks || 'Cannot sell token') : null,
      canMint,
      canBlacklist,
      isProxy,
      isSelfDestruct,
      ownerAddress: data.owner_address || null,
      ownerPercent,
      creatorAddress: data.creator_address || null,
      creatorPercent,
      top10HolderPercent,
      totalSupply: data.total_supply || null,
      lpHolderCount: data.lp_holder_count ? parseInt(data.lp_holder_count) : null,
      lpTotalSupply: data.lp_total_supply || null,
      buyTax,
      sellTax,
      riskScore,
      riskLevel,
      riskFlags,
      aiNarrative,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ contract, chain, riskScore, riskLevel }, 'token/safety');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, contract, chain }, 'token/safety error');
    res.status(500).json({ error: 'Failed to analyze token safety', details: err.message });
  }
});

export default router;