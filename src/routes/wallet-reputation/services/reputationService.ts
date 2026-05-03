import axios from 'axios';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const API_KEY = process.env.ETHERSCAN_API_KEY || '';

export async function getWalletReputation(address: string) {
  const [txResponse, balanceResponse, tokenResponse] = await Promise.all([
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, sort: 'asc', apikey: API_KEY },
      timeout: 10000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'balance', address, tag: 'latest', apikey: API_KEY },
      timeout: 10000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'tokentx', address, startblock: 0, endblock: 99999999, sort: 'asc', apikey: API_KEY },
      timeout: 10000,
    }),
  ]);

  const txs = txResponse.data.result || [];
  const balanceWei = balanceResponse.data.result || '0';
  const tokenTxs = tokenResponse.data.result || [];

  const balanceEth = parseFloat(balanceWei) / 1e18;
  const totalTxs = Array.isArray(txs) ? txs.length : 0;
  const firstTx = totalTxs > 0 ? txs[0] : null;
  const lastTx = totalTxs > 0 ? txs[txs.length - 1] : null;

  const firstSeen = firstTx ? new Date(parseInt(firstTx.timeStamp) * 1000).toISOString() : null;
  const lastSeen = lastTx ? new Date(parseInt(lastTx.timeStamp) * 1000).toISOString() : null;

  const ageInDays = firstTx
    ? Math.floor((Date.now() - parseInt(firstTx.timeStamp) * 1000) / (1000 * 60 * 60 * 24))
    : 0;

  const uniqueTokens = new Set(Array.isArray(tokenTxs) ? tokenTxs.map((t: any) => t.contractAddress) : []).size;
  const failedTxs = Array.isArray(txs) ? txs.filter((t: any) => t.isError === '1').length : 0;
  const failRate = totalTxs > 0 ? failedTxs / totalTxs : 0;

  let score = 0;
  const flags: string[] = [];

  if (ageInDays > 365) score += 25;
  else if (ageInDays > 90) score += 15;
  else if (ageInDays > 30) score += 8;
  else flags.push('new_wallet');

  if (totalTxs > 500) score += 25;
  else if (totalTxs > 100) score += 20;
  else if (totalTxs > 10) score += 10;
  else flags.push('low_activity');

  if (balanceEth > 1) score += 20;
  else if (balanceEth > 0.1) score += 10;
  else if (balanceEth === 0) flags.push('zero_balance');

  if (uniqueTokens > 20) score += 15;
  else if (uniqueTokens > 5) score += 10;

  if (failRate > 0.3) { score -= 20; flags.push('high_fail_rate'); }
  else if (failRate > 0.1) { score -= 10; flags.push('elevated_fail_rate'); }

  score = Math.max(0, Math.min(100, score));

  let rating = 'unknown';
  if (score >= 80) rating = 'excellent';
  else if (score >= 60) rating = 'good';
  else if (score >= 40) rating = 'fair';
  else if (score >= 20) rating = 'poor';
  else rating = 'very_poor';

  return {
    address,
    score,
    rating,
    flags,
    stats: {
      age_days: ageInDays,
      total_transactions: totalTxs,
      failed_transactions: failedTxs,
      fail_rate: parseFloat(failRate.toFixed(4)),
      balance_eth: parseFloat(balanceEth.toFixed(6)),
      unique_tokens_interacted: uniqueTokens,
      first_seen: firstSeen,
      last_seen: lastSeen,
    },
  };
}
