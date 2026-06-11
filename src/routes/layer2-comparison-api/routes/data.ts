// Curated static Layer-2 / scaling-network reference table. Hand-maintained
// constants — no LLM, no network. Categorical facts (type, settlement layer, VM,
// DA) are exact; numeric metrics (approx fee, throughput, finality) are curated
// order-of-magnitude estimates that drift over time — treat them as indicative,
// not live. Extend as the ecosystem evolves.

export type L2Type = 'optimistic_rollup' | 'zk_rollup' | 'validium' | 'sidechain';
export type DataAvailability = 'ethereum' | 'external_dac' | 'self';

export interface L2 {
  name: string;
  slug: string;
  type: L2Type;
  settlement_layer: string;
  vm: string;
  native_gas_token: string;
  data_availability: DataAvailability;
  approx_tx_fee_usd: number;        // indicative simple-transfer fee
  throughput_tps: number;           // indicative practical throughput
  time_to_finality: string;         // human-readable, to L1 finality
  ecosystem_maturity: 'emerging' | 'growing' | 'established';
  launched_year: number;
  notable_for: string;
}

export const L2S: L2[] = [
  { name: 'Arbitrum One', slug: 'arbitrum', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.03, throughput_tps: 40, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'established', launched_year: 2021, notable_for: 'Largest optimistic-rollup TVL and DeFi ecosystem.' },
  { name: 'OP Mainnet', slug: 'optimism', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.03, throughput_tps: 35, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'established', launched_year: 2021, notable_for: 'OP Stack and the Superchain vision.' },
  { name: 'Base', slug: 'base', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.02, throughput_tps: 35, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'established', launched_year: 2023, notable_for: 'Coinbase-incubated OP Stack chain with strong consumer adoption.' },
  { name: 'Blast', slug: 'blast', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.03, throughput_tps: 30, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'growing', launched_year: 2024, notable_for: 'Native yield on bridged ETH and stablecoins.' },
  { name: 'Mode', slug: 'mode', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.02, throughput_tps: 30, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'emerging', launched_year: 2024, notable_for: 'OP Stack chain focused on on-chain agents and DeFi.' },
  { name: 'zkSync Era', slug: 'zksync-era', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'zkEVM (LLVM)', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.05, throughput_tps: 30, time_to_finality: '~1 hour (proof + L1 verify)', ecosystem_maturity: 'established', launched_year: 2023, notable_for: 'Account abstraction native; custom zkEVM.' },
  { name: 'Polygon zkEVM', slug: 'polygon-zkevm', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'zkEVM (bytecode-equivalent)', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.04, throughput_tps: 30, time_to_finality: '~30–60 min (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2023, notable_for: 'EVM-equivalent zk proofs; part of the AggLayer.' },
  { name: 'Starknet', slug: 'starknet', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'Cairo VM', native_gas_token: 'ETH/STRK', data_availability: 'ethereum', approx_tx_fee_usd: 0.02, throughput_tps: 90, time_to_finality: '~few hours (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2021, notable_for: 'STARK proofs and the Cairo language; high prover scalability.' },
  { name: 'Linea', slug: 'linea', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'zkEVM (type-2)', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.04, throughput_tps: 30, time_to_finality: '~30–90 min (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2023, notable_for: 'ConsenSys zkEVM with deep MetaMask/Infura integration.' },
  { name: 'Scroll', slug: 'scroll', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'zkEVM (bytecode-equivalent)', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.05, throughput_tps: 25, time_to_finality: '~1–4 hours (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2023, notable_for: 'Open-source, bytecode-equivalent zkEVM.' },
  { name: 'Mantle', slug: 'mantle', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'MNT', data_availability: 'external_dac', approx_tx_fee_usd: 0.02, throughput_tps: 35, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'growing', launched_year: 2023, notable_for: 'Modular design using EigenDA for data availability.' },
  { name: 'Immutable X', slug: 'immutable-x', type: 'validium', settlement_layer: 'Ethereum', vm: 'StarkEx (non-EVM)', native_gas_token: 'IMX', data_availability: 'external_dac', approx_tx_fee_usd: 0.0, throughput_tps: 200, time_to_finality: '~few hours (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2021, notable_for: 'Gas-free NFT minting/trading via StarkEx validium.' },
  { name: 'Polygon PoS', slug: 'polygon-pos', type: 'sidechain', settlement_layer: 'Ethereum (checkpoints)', vm: 'EVM', native_gas_token: 'POL', data_availability: 'self', approx_tx_fee_usd: 0.01, throughput_tps: 60, time_to_finality: '~few seconds (chain) / checkpoints to L1', ecosystem_maturity: 'established', launched_year: 2020, notable_for: 'High-throughput EVM sidechain; not a rollup (own security).' },
];
