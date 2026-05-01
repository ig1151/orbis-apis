import { AgentIdentity } from '../types';

// In-memory store — persists for the lifetime of the process
// On Render free tier, resets on redeploy (acceptable for v1)
const agents: Map<string, AgentIdentity> = new Map();

export function saveAgent(identity: AgentIdentity): void {
  agents.set(identity.agentId, identity);
}

export function getAgent(agentId: string): AgentIdentity | null {
  return agents.get(agentId) || null;
}

export function getAgentByWallet(walletAddress: string): AgentIdentity | null {
  for (const agent of agents.values()) {
    if (agent.walletAddress?.toLowerCase() === walletAddress.toLowerCase()) {
      return agent;
    }
  }
  return null;
}

export function listAgents(): AgentIdentity[] {
  return Array.from(agents.values());
}

export function agentCount(): number {
  return agents.size;
}
