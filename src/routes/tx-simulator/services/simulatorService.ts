import axios from 'axios';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const API_KEY = process.env.ETHERSCAN_API_KEY || '';

export async function simulateTransaction(from: string, to: string, valueEth: number, gasLimit: number = 21000) {
  const [balanceRes, gasPriceRes, nonceRes] = await Promise.all([
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'account', action: 'balance', address: from, tag: 'latest', apikey: API_KEY },
      timeout: 8000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'gastracker', action: 'gasoracle', apikey: API_KEY },
      timeout: 8000,
    }),
    axios.get(ETHERSCAN_BASE, {
      params: { chainid: 1, module: 'proxy', action: 'eth_getTransactionCount', address: from, tag: 'latest', apikey: API_KEY },
      timeout: 8000,
    }),
  ]);

  const balanceWei = parseFloat(balanceRes.data.result || '0');
  const balanceEth = balanceWei / 1e18;

  const gasOracle = gasPriceRes.data.result || {};
  const gasPriceGwei = parseFloat(gasOracle.ProposeGasPrice || '20');
  const gasCostEth = (gasLimit * gasPriceGwei * 1e9) / 1e18;
  const totalCostEth = valueEth + gasCostEth;

  const nonce = parseInt(nonceRes.data.result || '0x0', 16);

  const wouldSucceed = balanceEth >= totalCostEth;
  const issues: string[] = [];

  if (balanceEth < valueEth) issues.push('insufficient_balance_for_value');
  if (balanceEth < totalCostEth) issues.push('insufficient_balance_for_gas');
  if (valueEth < 0) issues.push('negative_value');
  if (gasLimit < 21000) issues.push('gas_limit_too_low');

  return {
    would_succeed: wouldSucceed,
    issues,
    simulation: {
      from,
      to,
      value_eth: valueEth,
      gas_limit: gasLimit,
      gas_price_gwei: gasPriceGwei,
      gas_cost_eth: parseFloat(gasCostEth.toFixed(8)),
      total_cost_eth: parseFloat(totalCostEth.toFixed(8)),
      sender_balance_eth: parseFloat(balanceEth.toFixed(8)),
      remaining_balance_eth: parseFloat((balanceEth - totalCostEth).toFixed(8)),
      nonce,
    },
    gas_oracle: {
      safe: gasOracle.SafeGasPrice,
      propose: gasOracle.ProposeGasPrice,
      fast: gasOracle.FastGasPrice,
    },
  };
}
