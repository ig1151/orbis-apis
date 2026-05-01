import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = 'https://api.gopluslabs.io/api/v1';

const CHAIN_IDS: Record<string, string> = {
  ethereum: '1',
  bsc: '56',
  polygon: '137',
  arbitrum: '42161',
  optimism: '10',
  base: '8453',
  avalanche: '43114',
  fantom: '250',
  solana: 'solana',
};

export function getChainId(chain: string): string {
  return CHAIN_IDS[chain.toLowerCase()] || '1';
}

export interface GoPlusTokenData {
  token_name?: string;
  token_symbol?: string;
  is_honeypot?: string;
  honeypot_with_same_creator?: string;
  can_take_back_ownership?: string;
  owner_change_balance?: string;
  hidden_owner?: string;
  selfdestruct?: string;
  external_call?: string;
  buy_tax?: string;
  sell_tax?: string;
  cannot_buy?: string;
  cannot_sell_all?: string;
  slippage_modifiable?: string;
  is_blacklisted?: string;
  is_whitelisted?: string;
  is_in_dex?: string;
  transfer_pausable?: string;
  is_proxy?: string;
  is_mintable?: string;
  owner_address?: string;
  creator_address?: string;
  owner_percent?: string;
  creator_percent?: string;
  top_10_holder_rate?: string;
  total_supply?: string;
  lp_holder_count?: string;
  lp_total_supply?: string;
  holder_count?: string;
  trust_list?: string;
  other_potential_risks?: string;
  note?: string;
}

export async function getTokenSecurity(contractAddress: string, chain = 'ethereum'): Promise<GoPlusTokenData | null> {
  try {
    let url: string;
    let params: Record<string, string>;

    if (chain === 'solana') {
      url = `${BASE_URL}/solana/token_security`;
      params = { contract_addresses: contractAddress };
    } else {
      const chainId = getChainId(chain);
      url = `${BASE_URL}/token_security/${chainId}`;
      params = { contract_addresses: contractAddress.toLowerCase() };
    }

    const res = await axios.get(url, { params, timeout: 10000 });

    if (res.data.code !== 1) {
      logger.warn({ contractAddress, chain, code: res.data.code }, 'GoPlus non-success');
      return null;
    }

    const key = chain === 'solana' ? contractAddress : contractAddress.toLowerCase();
    const result = res.data.result?.[key];
    return result || null;
  } catch (err: any) {
    logger.error({ err: err.message, contractAddress, chain }, 'GoPlus token security error');
    return null;
  }
}

export async function getMaliciousAddress(address: string, chain = 'ethereum'): Promise<boolean> {
  const chainId = getChainId(chain);
  try {
    const res = await axios.get(`${BASE_URL}/address_security/${address.toLowerCase()}`, {
      params: { chain_id: chainId },
      timeout: 8000,
    });
    if (res.data.code !== 1) return false;
    const r = res.data.result;
    return r?.malicious_address === '1' || r?.phishing_activities === '1' || false;
  } catch {
    return false;
  }
}