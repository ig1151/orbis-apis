import { createApiInfoRouter } from "../../middleware/apiInfo";

export const agentIdentityInfo = createApiInfoRouter({
  name: "Agent Identity API",
  slug: "agent-identity",
  version: "2.0.0",
  category: "AI Agents",
  description:
    "Identity, verification, reputation, and attestation layer for autonomous AI agents. " +
    "Create, verify, and look up persistent on-chain identities for AI agents, including " +
    "reputation scores, trust signals, and signed attestations for marketplace and multi-agent workflows.",
  endpoints: [
    { method: "POST", path: "/agent-identity/generate", description: "Create a new persistent on-chain identity for an AI agent. Returns DID, public key, wallet address, and initial trust metadata." },
    { method: "POST", path: "/agent-identity/verify", description: "Verify an existing agent identity. Updates verification status, reputation score, and trust level." },
    { method: "GET", path: "/agent-identity/reputation", description: "Get full reputation profile: score, trust level, attestation count, claim breakdown, and score history." },
    { method: "POST", path: "/agent-identity/attest", description: "Issue a signed attestation for capability, ownership, reputation, permission, or compliance claims. Updates reputation score." },
    { method: "GET", path: "/agent-identity/:agentId", description: "Look up full agent identity record including DID, keys, reputation, and recent attestations." },
  ],
});
