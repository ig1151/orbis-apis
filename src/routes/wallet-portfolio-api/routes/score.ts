import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getEthBalance, getTxList, getTokenBalances, getEthPrice } from '../services/etherscan';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { WalletScore } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'];

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

function getGrade(score: number): WalletScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address, chain } = req.query as { address: string; chain: string };

  try {
    const ethBalance = await getEthBalance(address, chain);
    const ethPrice = await getEthPrice();
    const txList = await getTxList(address, chain, 100);
    const tokenTxs = await getTokenBalances(address, chain);

    const ethBalanceNum = parseFloat(ethBalance);
    const ethBalanceUsd = ethPrice ? ethBalanceNum * ethPrice : 0;
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    const recentTxs = txList.filter((tx: any) => parseInt(tx.timeStamp) > thirtyDaysAgo);
    const uniqueCounterparties = new Set(txList.map((tx: any) =>
      tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from
    )).size;

    // Diversification score
    let diversification = 30;
    if (tokenTxs.length >= 5) diversification += 30;
    else if (tokenTxs.length >= 2) diversification += 15;
    if (ethBalanceUsd > 1000) diversification += 20;
    if (ethBalanceUsd > 10000) diversification += 20;
    diversification = Math.min(100, diversification);

    // Activity score
    let activity = 20;
    if (txList.length >= 50) activity += 30;
    else if (txList.length >= 10) activity += 15;
    if (recentTxs.length >= 10) activity += 30;
    else if (recentTxs.length >= 3) activity += 15;
    if (uniqueCounterparties >= 10) activity += 20;
    activity = Math.min(100, activity);

    // Risk management score (based on not being concentrated)
    let riskManagement = 50;
    if (ethBalanceUsd > 100) riskManagement += 20;
    if (tokenTxs.length > 0 && tokenTxs.length <= 10) riskManagement += 15; // not too many random tokens
    if (txList.length > 0) riskManagement += 15;
    riskManagement = Math.min(100, riskManagement);

    // DeFi engagement
    let defiEngagement = 20;
    if (tokenTxs.length >= 3) defiEngagement += 30;
    if (recentTxs.length >= 5) defiEngagement += 25;
    if (uniqueCounterparties >= 5) defiEngagement += 25;
    defiEngagement = Math.min(100, defiEngagement);

    const overallScore = Math.round(
      diversification * 0.25 + activity * 0.25 + riskManagement * 0.25 + defiEngagement * 0.25
    );

    const grade = getGrade(overallScore);

    // AI narrative
    const context = `Wallet: ${address} on ${chain}
ETH Balance: ${ethBalance} ETH (~$${Math.round(ethBalanceUsd).toLocaleString()})
Total transactions: ${txList.length}
Recent (30d) transactions: ${recentTxs.length}
Unique counterparties: ${uniqueCounterparties}
Token types held: ${tokenTxs.length}
Scores — Diversification: ${diversification}/100, Activity: ${activity}/100, Risk: ${riskManagement}/100, DeFi: ${defiEngagement}/100
Overall: ${overallScore}/100 (${grade})`;

    const aiPrompt = `You are a crypto wallet analyst. Analyze this wallet and provide a health assessment.

${context}

Respond ONLY in this JSON format (no markdown):
{
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string", "string"],
  "aiNarrative": "string (2 sentences summarizing wallet health and most important action to take)"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { strengths: [], weaknesses: [], recommendations: [], aiNarrative: aiResponse.slice(0, 200) };
    }

    const result: WalletScore = {
      address,
      chain,
      overallScore,
      grade,
      categories: {
        diversification,
        activity,
        riskManagement,
        defiEngagement,
      },
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      recommendations: parsed.recommendations || [],
      aiNarrative: parsed.aiNarrative || '',
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ address, chain, overallScore, grade }, 'wallet/score');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, address, chain }, 'score error');
    res.status(500).json({ error: 'Failed to score wallet', details: err.message });
  }
});

export default router;
