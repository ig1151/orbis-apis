export interface SkillInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface AgentSkill {
  skillId: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  endpoint: string;
  method: 'GET' | 'POST';
  inputs: SkillInput[];
  outputs: SkillOutput[];
  pricingType: 'free' | 'per_call' | 'subscription';
  pricePerCall: number | null;
  framework: string | null;
  ownerAgentId: string | null;
  tags: string[];
  invocationCount: number;
  lastInvokedAt: string | null;
  registeredAt: string;
  version: string;
  isActive: boolean;
}

export interface SkillMatch {
  request: string;
  matches: Array<{
    skill: AgentSkill;
    matchScore: number;
    matchReason: string;
    recommendedParams: Record<string, string> | null;
  }>;
  bestMatch: AgentSkill | null;
  aiExplanation: string;
  analyzedAt: string;
}
