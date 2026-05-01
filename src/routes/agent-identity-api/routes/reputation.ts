import { Router, Request, Response } from 'express';
import { getAgent } from '../store/agents';
import { getWalletStats } from '../services/etherscan';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { AgentReputation } from '../types';

const router = Router();

function getTrustLevel(score: number): AgentReputation['trustLevel'] {
  if (score >= 80) return 'ELITE';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'UNVERIFIED';
}

router.get('/:agentId', async (req: Request, res: Response): Promise<void> => {
  const { agentId } = req.params;

  try {
    const identity = getAgent(agentId);

    if (!identity) {
      res.status(404).json({ error: `Agent "${agentId}" not found in registry` });
      return;
    }

    if (!identity.walletAddress) {
      // No wallet — basic reputation from registration data only
      const result: AgentReputation = {
        agentId,
        walletAddress: 'none',
        reputationScore: 10,
        trustLevel: 'UNVERIFIED',
        onchainAge: null,
        totalTransactions: 0,
        uniqueCounterparties: 0,
        totalVolumeEth: '0',
        firstSeenAt: null,
        lastActiveAt: null,
        signals: ['No wallet address provided — cannot verify onchain activity'],
        aiSummary: `Agent "${identity.name}" has no linked wallet address. Reputation is limited to self-reported registration data only.`,
        analyzedAt: new Date().toISOString(),
      };
      res.json({ success: true, data: result });
      return;
    }

    const stats = await getWalletStats(identity.walletAddress);

    const signals: string[] = [];
    let reputationScore = 0;

    if (stats) {
      // Score based on onchain activity
      if (stats.txCount >= 100) { reputationScore += 25; signals.push(`High activity: ${stats.txCount} transactions`); }
      else if (stats.txCount >= 20) { reputationScore += 15; signals.push(`Moderate activity: ${stats.txCount} transactions`); }
      else if (stats.txCount > 0) { reputationScore += 5; signals.push(`Low activity: ${stats.txCount} transactions`); }
      else { signals.push('No onchain transactions found'); }

      if (stats.uniqueCounterparties >= 20) { reputationScore += 20; signals.push(`Diverse interactions: ${stats.uniqueCounterparties} unique counterparties`); }
      else if (stats.uniqueCounterparties >= 5) { reputationScore += 10; signals.push(`${stats.uniqueCounterparties} unique counterparties`); }

      if (stats.totalValueEth >= 10) { reputationScore += 20; signals.push(`Significant volume: ${stats.totalValueEth} ETH transacted`); }
      else if (stats.totalValueEth >= 1) { reputationScore += 10; signals.push(`${stats.totalValueEth} ETH transacted`); }

      if (stats.firstTx) {
        const ageDays = (Date.now() - new Date(stats.firstTx).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays >= 365) { reputationScore += 20; signals.push(`Established wallet: ${Math.floor(ageDays / 365)} year(s) old`); }
        else if (ageDays >= 90) { reputationScore += 10; signals.push(`Wallet age: ${Math.floor(ageDays)} days`); }
        else { signals.push(`New wallet: ${Math.floor(ageDays)} days old`); }
      }

      // Capability bonus
      if (identity.capabilities.length >= 3) { reputationScore += 10; signals.push(`Declared ${identity.capabilities.length} capabilities`); }
      if (identity.framework) { reputationScore += 5; signals.push(`Known framework: ${identity.framework}`); }

      reputationScore = Math.min(100, reputationScore);
    } else {
      signals.push('Unable to fetch onchain data');
      reputationScore = 5;
    }

    const trustLevel = getTrustLevel(reputationScore);

    // AI summary
    const context = `Agent: ${identity.name}
Wallet: ${identity.walletAddress}
Capabilities: ${identity.capabilities.join(', ')}
Framework: ${identity.framework || 'unknown'}
Onchain transactions: ${stats?.txCount || 0}
Unique counterparties: ${stats?.uniqueCounterparties || 0}
Total ETH volume: ${stats?.totalValueEth || 0}
Wallet age: ${stats?.firstTx ? Math.floor((Date.now() - new Date(stats.firstTx).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'unknown'}
Reputation score: ${reputationScore}/100 (${trustLevel})
Signals: ${signals.join(', ')}`;

    const aiSummary = await callAI(
      `You are an AI agent trust analyst. Write 2 sentences summarizing this agent's reputation and whether it should be trusted for autonomous operations.\n\n${context}`
    );

    const result: AgentReputation = {
      agentId,
      walletAddress: identity.walletAddress,
      reputationScore,
      trustLevel,
      onchainAge: stats?.firstTx
        ? `${Math.floor((Date.now() - new Date(stats.firstTx).getTime()) / (1000 * 60 * 60 * 24))} days`
        : null,
      totalTransactions: stats?.txCount || 0,
      uniqueCounterparties: stats?.uniqueCounterparties || 0,
      totalVolumeEth: stats?.totalValueEth?.toString() || '0',
      firstSeenAt: stats?.firstTx || null,
      lastActiveAt: stats?.lastTx || null,
      signals,
      aiSummary,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ agentId, reputationScore, trustLevel }, 'reputation');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, agentId }, 'reputation error');
    res.status(500).json({ error: 'Failed to fetch reputation', details: err.message });
  }
});

export default router;
