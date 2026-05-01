// Curated token unlock database
// Dates are approximate — major known unlocks for 2025-2026
// All amounts in millions of tokens

export interface RawUnlock {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string;
  category: string;
  tgeDate: string;
  totalSupply: number; // millions
  unlocks: Array<{
    date: string; // YYYY-MM-DD
    amount: number; // millions
    recipient: string;
    vestingType: 'cliff' | 'linear' | 'milestone';
    notes?: string;
  }>;
}

export const TOKEN_UNLOCKS: RawUnlock[] = [
  {
    id: 'arb',
    symbol: 'ARB',
    name: 'Arbitrum',
    coingeckoId: 'arbitrum',
    category: 'Layer 2',
    tgeDate: '2023-03-23',
    totalSupply: 10000,
    unlocks: [
      { date: '2024-03-16', amount: 1113, recipient: 'Team & Investors', vestingType: 'cliff', notes: '1-year cliff unlock' },
      { date: '2025-03-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear', notes: 'Monthly linear vesting' },
      { date: '2025-04-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-05-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-06-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-07-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-08-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-09-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-10-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-11-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2025-12-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-01-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-02-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-03-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-04-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-05-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
      { date: '2026-06-16', amount: 92.5, recipient: 'Team & Investors', vestingType: 'linear' },
    ],
  },
  {
    id: 'op',
    symbol: 'OP',
    name: 'Optimism',
    coingeckoId: 'optimism',
    category: 'Layer 2',
    tgeDate: '2022-06-01',
    totalSupply: 4294,
    unlocks: [
      { date: '2025-05-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-06-30', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-07-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-08-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-09-30', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-10-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-11-30', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-12-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-01-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-02-28', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-03-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-04-30', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-05-31', amount: 31.3, recipient: 'Core Contributors', vestingType: 'linear' },
    ],
  },
  {
    id: 'apt',
    symbol: 'APT',
    name: 'Aptos',
    coingeckoId: 'aptos',
    category: 'Layer 1',
    tgeDate: '2022-10-19',
    totalSupply: 1000,
    unlocks: [
      { date: '2025-05-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-06-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-07-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-08-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-09-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-10-12', amount: 11.31, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2025-11-12', amount: 11.31, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-12-12', amount: 11.31, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-01-12', amount: 11.31, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-02-12', amount: 11.31, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-03-12', amount: 11.31, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-04-12', amount: 11.31, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2026-05-12', amount: 11.31, recipient: 'Core Contributors', vestingType: 'linear' },
    ],
  },
  {
    id: 'sui',
    symbol: 'SUI',
    name: 'Sui',
    coingeckoId: 'sui',
    category: 'Layer 1',
    tgeDate: '2023-05-03',
    totalSupply: 10000,
    unlocks: [
      { date: '2025-05-03', amount: 64.2, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-06-03', amount: 64.2, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-07-03', amount: 64.2, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-08-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-09-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-10-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-11-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-12-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-01-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-02-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-03-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-04-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-05-03', amount: 64.2, recipient: 'Team', vestingType: 'linear' },
    ],
  },
  {
    id: 'strk',
    symbol: 'STRK',
    name: 'Starknet',
    coingeckoId: 'starknet',
    category: 'Layer 2',
    tgeDate: '2024-02-20',
    totalSupply: 10000,
    unlocks: [
      { date: '2025-04-15', amount: 64, recipient: 'Early Contributors', vestingType: 'cliff' },
      { date: '2025-07-15', amount: 64, recipient: 'Early Contributors', vestingType: 'cliff' },
      { date: '2025-10-15', amount: 64, recipient: 'Investors', vestingType: 'cliff' },
      { date: '2026-01-15', amount: 64, recipient: 'Investors', vestingType: 'cliff' },
      { date: '2026-04-15', amount: 64, recipient: 'Early Contributors', vestingType: 'cliff' },
      { date: '2026-07-15', amount: 64, recipient: 'Early Contributors', vestingType: 'cliff' },
    ],
  },
  {
    id: 'sei',
    symbol: 'SEI',
    name: 'Sei Network',
    coingeckoId: 'sei-network',
    category: 'Layer 1',
    tgeDate: '2023-08-15',
    totalSupply: 10000,
    unlocks: [
      { date: '2025-05-15', amount: 120, recipient: 'Ecosystem', vestingType: 'linear' },
      { date: '2025-06-15', amount: 120, recipient: 'Ecosystem', vestingType: 'linear' },
      { date: '2025-07-15', amount: 120, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-08-15', amount: 120, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-09-15', amount: 120, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-10-15', amount: 120, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-11-15', amount: 120, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-12-15', amount: 120, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2026-01-15', amount: 120, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2026-02-15', amount: 120, recipient: 'Foundation', vestingType: 'linear' },
      { date: '2026-03-15', amount: 120, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-04-15', amount: 120, recipient: 'Team', vestingType: 'linear' },
    ],
  },
  {
    id: 'eigen',
    symbol: 'EIGEN',
    name: 'EigenLayer',
    coingeckoId: 'eigenlayer',
    category: 'Restaking',
    tgeDate: '2024-09-17',
    totalSupply: 1673,
    unlocks: [
      { date: '2025-09-17', amount: 55.6, recipient: 'Investors', vestingType: 'cliff', notes: '1-year cliff' },
      { date: '2025-09-17', amount: 55.6, recipient: 'Team', vestingType: 'cliff', notes: '1-year cliff' },
      { date: '2025-10-17', amount: 9.3, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-11-17', amount: 9.3, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-12-17', amount: 9.3, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-01-17', amount: 9.3, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-02-17', amount: 9.3, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-03-17', amount: 9.3, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-04-17', amount: 9.3, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-05-17', amount: 9.3, recipient: 'Team', vestingType: 'linear' },
    ],
  },
  {
    id: 'zk',
    symbol: 'ZK',
    name: 'ZKsync',
    coingeckoId: 'zksync',
    category: 'Layer 2',
    tgeDate: '2024-06-17',
    totalSupply: 21000,
    unlocks: [
      { date: '2025-06-17', amount: 700, recipient: 'Investors', vestingType: 'cliff', notes: '1-year cliff' },
      { date: '2025-06-17', amount: 700, recipient: 'Team', vestingType: 'cliff', notes: '1-year cliff' },
      { date: '2025-07-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-08-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
      { date: '2025-09-17', amount: 116.7, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-10-17', amount: 116.7, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-11-17', amount: 116.7, recipient: 'Team', vestingType: 'linear' },
      { date: '2025-12-17', amount: 116.7, recipient: 'Team', vestingType: 'linear' },
      { date: '2026-01-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-02-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-03-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-04-17', amount: 116.7, recipient: 'Investors', vestingType: 'linear' },
    ],
  },
  {
    id: 'blur',
    symbol: 'BLUR',
    name: 'Blur',
    coingeckoId: 'blur',
    category: 'NFT',
    tgeDate: '2023-02-14',
    totalSupply: 3000,
    unlocks: [
      { date: '2025-05-14', amount: 50, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-08-14', amount: 50, recipient: 'Core Contributors', vestingType: 'linear' },
      { date: '2025-11-14', amount: 50, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-02-14', amount: 50, recipient: 'Investors', vestingType: 'linear' },
      { date: '2026-05-14', amount: 50, recipient: 'Core Contributors', vestingType: 'linear' },
    ],
  },
  {
    id: 'pyth',
    symbol: 'PYTH',
    name: 'Pyth Network',
    coingeckoId: 'pyth-network',
    category: 'Oracle',
    tgeDate: '2023-11-20',
    totalSupply: 10000,
    unlocks: [
      { date: '2025-05-20', amount: 83.3, recipient: 'Ecosystem Development', vestingType: 'linear' },
      { date: '2025-06-20', amount: 83.3, recipient: 'Ecosystem Development', vestingType: 'linear' },
      { date: '2025-07-20', amount: 83.3, recipient: 'Protocol Development', vestingType: 'linear' },
      { date: '2025-08-20', amount: 83.3, recipient: 'Protocol Development', vestingType: 'linear' },
      { date: '2025-09-20', amount: 83.3, recipient: 'Community & Launch', vestingType: 'linear' },
      { date: '2025-10-20', amount: 83.3, recipient: 'Community & Launch', vestingType: 'linear' },
      { date: '2025-11-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
      { date: '2025-12-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
      { date: '2026-01-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
      { date: '2026-02-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
      { date: '2026-03-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
      { date: '2026-04-20', amount: 83.3, recipient: 'Private Sales', vestingType: 'linear' },
    ],
  },
];

export function getTokenBySymbol(symbol: string): RawUnlock | undefined {
  return TOKEN_UNLOCKS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}

export function getAllUpcomingUnlocks(days = 30): Array<RawUnlock & { nextUnlock: RawUnlock['unlocks'][0] }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const results: Array<RawUnlock & { nextUnlock: RawUnlock['unlocks'][0] }> = [];

  for (const token of TOKEN_UNLOCKS) {
    for (const unlock of token.unlocks) {
      const unlockDate = new Date(unlock.date);
      if (unlockDate >= now && unlockDate <= cutoff) {
        results.push({ ...token, nextUnlock: unlock });
      }
    }
  }

  return results.sort((a, b) => new Date(a.nextUnlock.date).getTime() - new Date(b.nextUnlock.date).getTime());
}
