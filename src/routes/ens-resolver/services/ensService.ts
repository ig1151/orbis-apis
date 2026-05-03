import axios from 'axios';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';

export async function resolveENS(ens: string) {
  const { data } = await axios.get(ETHERSCAN_BASE, {
    params: { chainid: 1, module: 'account', action: 'addresstag', address: ens, apikey: ETHERSCAN_KEY },
    timeout: 8000,
  });

  const ensRes = await axios.get(`https://api.ensideas.com/ens/resolve/${ens}`, {
    timeout: 8000,
  });

  const profile = ensRes.data || {};

  return {
    ens,
    address: profile.address || null,
    display_name: profile.displayName || ens,
    avatar: profile.avatar || null,
    records: profile.records || {},
    resolved: !!profile.address,
  };
}

export async function lookupAddress(address: string) {
  const ensRes = await axios.get(`https://api.ensideas.com/ens/resolve/${address}`, {
    timeout: 8000,
  });

  const profile = ensRes.data || {};

  return {
    address,
    ens: profile.name || null,
    display_name: profile.displayName || null,
    avatar: profile.avatar || null,
    records: profile.records || {},
    resolved: !!profile.name,
  };
}
