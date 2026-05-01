export interface AgentIdentity {
  agentId: string;
  walletAddress: string | null;
  name: string;
  description: string;
  capabilities: string[];
  framework: string | null;
  operator: string | null;
  proof: string; // JWT
  createdAt: string;
  expiresAt: string;
}

export interface AgentReputation {
  agentId: string;
  walletAddress: string;
  reputationScore: number; // 0-100
  trustLevel: 'UNVERIFIED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ELITE';
  onchainAge: string | null;
  totalTransactions: number;
  uniqueCounterparties: number;
  totalVolumeEth: string;
  firstSeenAt: string | null;
  lastActiveAt: string | null;
  signals: string[];
  aiSummary: string;
  analyzedAt: string;
}

export interface VerifyResult {
  valid: boolean;
  agentId: string | null;
  reason: string;
  identity: AgentIdentity | null;
}
