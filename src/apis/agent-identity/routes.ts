import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const router = Router();

interface AgentIdentity {
  agentId: string;
  did: string;
  publicKey: string;
  walletAddress: string;
  createdAt: string;
  reputationScore: number;
  trustLevel: "unverified" | "basic" | "verified" | "trusted" | "elite";
  verificationStatus: "pending" | "verified" | "revoked";
  attestationCount: number;
  metadata: { version: string; chain: string; schemaVersion: string };
}

interface Attestation {
  attestationId: string;
  agentId: string;
  claimType: "capability" | "ownership" | "reputation" | "permission" | "compliance";
  claim: string;
  evidence: Record<string, unknown>;
  issuer: string;
  verified: boolean;
  timestamp: string;
  trustImpact: number;
  signatureHash: string;
  expiresAt: string;
}

const identityStore = new Map<string, AgentIdentity>();
const attestationStore = new Map<string, Attestation[]>();

function deriveWalletAddress(seed: string): string {
  return "0x" + crypto.createHash("sha256").update(seed).digest("hex").slice(0, 40);
}
function derivePublicKey(seed: string): string {
  return "pk_" + crypto.createHash("sha256").update(seed + "pubkey").digest("hex").slice(0, 64);
}
function deriveDID(agentId: string): string {
  return "did:orbis:agent:" + agentId;
}
function computeTrustLevel(score: number): AgentIdentity["trustLevel"] {
  if (score >= 90) return "elite";
  if (score >= 75) return "trusted";
  if (score >= 50) return "verified";
  if (score >= 25) return "basic";
  return "unverified";
}
function computeTrustImpact(claimType: Attestation["claimType"]): number {
  const impacts: Record<string, number> = { compliance: 15, reputation: 12, ownership: 10, capability: 7, permission: 5 };
  return impacts[claimType] ?? 5;
}
function successMeta(startMs: number) {
  return { timestamp: new Date().toISOString(), latencyMs: Date.now() - startMs, version: "2.0.0", provider: "orbis-agent-identity" };
}

router.post("/generate", (req: Request, res: Response) => {
  const start = Date.now();
  const { label, capabilities = [], ownerAddress, metadata = {} } = req.body;
  if (!label || typeof label !== "string") {
    return res.status(400).json({ success: false, error: { code: "MISSING_LABEL", message: "label (string) is required" }, meta: successMeta(start) });
  }
  const agentId = "agent_" + uuidv4().replace(/-/g, "").slice(0, 20);
  const seed = agentId + "-" + label + "-" + Date.now();
  const identity: AgentIdentity = {
    agentId, did: deriveDID(agentId), publicKey: derivePublicKey(seed),
    walletAddress: ownerAddress ?? deriveWalletAddress(seed),
    createdAt: new Date().toISOString(), reputationScore: 10, trustLevel: "unverified",
    verificationStatus: "pending", attestationCount: 0,
    metadata: { version: "1.0", chain: metadata.chain ?? "ethereum", schemaVersion: "orbis-agent-id-v2" },
  };
  identityStore.set(agentId, identity);
  attestationStore.set(agentId, []);
  return res.status(201).json({
    success: true,
    data: { agentId: identity.agentId, did: identity.did, publicKey: identity.publicKey, walletAddress: identity.walletAddress, label, capabilities, createdAt: identity.createdAt, reputationScore: identity.reputationScore, trustLevel: identity.trustLevel, verificationStatus: identity.verificationStatus, metadata: identity.metadata },
    confidence: { score: 1.0, signals: ["identity_generated", "did_assigned", "keys_derived"] },
    meta: successMeta(start),
  });
});

router.post("/verify", (req: Request, res: Response) => {
  const start = Date.now();
  const { agentId, signature, challenge } = req.body;
  if (!agentId) {
    return res.status(400).json({ success: false, error: { code: "MISSING_AGENT_ID", message: "agentId is required" }, meta: successMeta(start) });
  }
  const identity = identityStore.get(agentId);
  const verified = !!identity;
  const signatureValid = !!signature && signature.length > 10;
  const challengeValid = !!challenge;
  if (identity && verified) {
    identity.verificationStatus = "verified";
    identity.reputationScore = Math.min(100, identity.reputationScore + 15);
    identity.trustLevel = computeTrustLevel(identity.reputationScore);
    identityStore.set(agentId, identity);
  }
  const trustSignals = [
    verified && "identity_found", signatureValid && "signature_valid",
    challengeValid && "challenge_present",
    identity?.attestationCount && identity.attestationCount > 0 && "attestations_on_record",
  ].filter(Boolean) as string[];
  const confidenceScore = parseFloat(((trustSignals.length / 4) * 0.9 + 0.1).toFixed(3));
  return res.json({
    success: true,
    data: { agentId, verified, verificationStatus: identity?.verificationStatus ?? "not_found", reputationScore: identity?.reputationScore ?? 0, trustLevel: identity?.trustLevel ?? "unverified", did: identity?.did ?? null, walletAddress: identity?.walletAddress ?? null, attestationCount: identity?.attestationCount ?? 0, lastVerified: verified ? new Date().toISOString() : null },
    confidence: { score: confidenceScore, signals: trustSignals },
    meta: successMeta(start),
  });
});

router.get("/reputation", (req: Request, res: Response) => {
  const start = Date.now();
  const { agentId } = req.query;
  if (!agentId || typeof agentId !== "string") {
    return res.status(400).json({ success: false, error: { code: "MISSING_AGENT_ID", message: "agentId query param required" }, meta: successMeta(start) });
  }
  const identity = identityStore.get(agentId);
  if (!identity) {
    return res.status(404).json({ success: false, error: { code: "AGENT_NOT_FOUND", message: "No agent found for id: " + agentId }, meta: successMeta(start) });
  }
  const attestations = attestationStore.get(agentId) ?? [];
  const claimBreakdown = attestations.reduce((acc: Record<string, number>, a) => { acc[a.claimType] = (acc[a.claimType] ?? 0) + 1; return acc; }, {});
  return res.json({
    success: true,
    data: { agentId, did: identity.did, reputationScore: identity.reputationScore, trustLevel: identity.trustLevel, verificationStatus: identity.verificationStatus, attestationCount: identity.attestationCount, claimBreakdown, walletAddress: identity.walletAddress, createdAt: identity.createdAt,
      reputationHistory: [
        { event: "identity_created", delta: 10, score: 10, timestamp: identity.createdAt },
        ...(identity.verificationStatus === "verified" ? [{ event: "identity_verified", delta: 15, score: 25, timestamp: new Date().toISOString() }] : []),
      ],
    },
    confidence: { score: identity.reputationScore / 100, signals: [identity.verificationStatus === "verified" && "identity_verified", identity.attestationCount > 0 && "attestations_present", identity.attestationCount >= 3 && "multi_attested"].filter(Boolean) as string[] },
    meta: successMeta(start),
  });
});

router.post("/attest", (req: Request, res: Response) => {
  const start = Date.now();
  const { agentId, claimType, claim, evidence = {}, issuer } = req.body;
  const validClaimTypes = ["capability", "ownership", "reputation", "permission", "compliance"];
  if (!agentId) return res.status(400).json({ success: false, error: { code: "MISSING_AGENT_ID", message: "agentId is required" }, meta: successMeta(start) });
  if (!claimType || !validClaimTypes.includes(claimType)) return res.status(400).json({ success: false, error: { code: "INVALID_CLAIM_TYPE", message: "claimType must be one of: " + validClaimTypes.join(", ") }, meta: successMeta(start) });
  if (!claim || typeof claim !== "string") return res.status(400).json({ success: false, error: { code: "MISSING_CLAIM", message: "claim (string) is required" }, meta: successMeta(start) });
  if (!issuer || typeof issuer !== "string") return res.status(400).json({ success: false, error: { code: "MISSING_ISSUER", message: "issuer (string) is required" }, meta: successMeta(start) });
  const identity = identityStore.get(agentId);
  if (!identity) return res.status(404).json({ success: false, error: { code: "AGENT_NOT_FOUND", message: "No agent found for id: " + agentId }, meta: successMeta(start) });
  const trustImpact = computeTrustImpact(claimType);
  const attestationId = "attest_" + uuidv4().replace(/-/g, "").slice(0, 20);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const signatureHash = crypto.createHash("sha256").update(JSON.stringify({ agentId, claimType, claim, issuer })).digest("hex");
  const attestation: Attestation = { attestationId, agentId, claimType, claim, evidence, issuer, verified: true, timestamp: now.toISOString(), trustImpact, signatureHash, expiresAt };
  identity.reputationScore = Math.min(100, identity.reputationScore + trustImpact);
  identity.trustLevel = computeTrustLevel(identity.reputationScore);
  identity.attestationCount += 1;
  identityStore.set(agentId, identity);
  const existing = attestationStore.get(agentId) ?? [];
  existing.push(attestation);
  attestationStore.set(agentId, existing);
  return res.status(201).json({
    success: true,
    data: { attestationId, agentId, verified: true, claimType, claim, issuer, signatureHash, trustImpact, updatedReputationScore: identity.reputationScore, updatedTrustLevel: identity.trustLevel, timestamp: attestation.timestamp, expiresAt },
    confidence: { score: 0.97, signals: ["claim_validated", "signature_computed", "reputation_updated", "claim_type_" + claimType] },
    meta: successMeta(start),
  });
});

router.get("/:agentId", (req: Request, res: Response) => {
  const start = Date.now();
  const { agentId } = req.params;
  const identity = identityStore.get(agentId);
  if (!identity) return res.status(404).json({ success: false, error: { code: "AGENT_NOT_FOUND", message: "No agent found for id: " + agentId }, meta: successMeta(start) });
  const attestations = attestationStore.get(agentId) ?? [];
  return res.json({
    success: true,
    data: { agentId: identity.agentId, did: identity.did, publicKey: identity.publicKey, walletAddress: identity.walletAddress, reputationScore: identity.reputationScore, trustLevel: identity.trustLevel, verificationStatus: identity.verificationStatus, attestationCount: identity.attestationCount, createdAt: identity.createdAt, metadata: identity.metadata,
      recentAttestations: attestations.slice(-5).map((a) => ({ attestationId: a.attestationId, claimType: a.claimType, issuer: a.issuer, verified: a.verified, trustImpact: a.trustImpact, timestamp: a.timestamp })),
    },
    confidence: { score: identity.reputationScore / 100, signals: ["identity_on_record", identity.verificationStatus === "verified" && "verified_identity", identity.attestationCount > 0 && "has_attestations"].filter(Boolean) as string[] },
    meta: successMeta(start),
  });
});

export default router;
