// Reusable OpenAPI 3.1 schema fragments for the non-finance A+ APIs, mirroring
// the validated finance convention: allOf composites use `unevaluatedProperties:
// false` (NEVER `additionalProperties:false` on an allOf branch — that self-rejects
// sibling props, the documented IP-Subnet bug). Leaves use additionalProperties:false.

export const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

export const ExecutionMetadata = {
  type: 'object',
  required: ['model', 'automation_safe'],
  additionalProperties: false,
  properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } },
};

export const ConfidencePerSection = {
  type: 'object',
  additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
};

// Per-API strict confidence_per_section schema: locks the section vocabulary to a
// known set (no arbitrary keys) while leaving keys optional so different endpoints
// may emit subsets. Bind it as the spec's `ConfidencePerSection` and the shared
// `_Tail` $ref resolves to it within that self-contained spec.
export function confSections(...keys: string[]) {
  const properties: Record<string, { type: string; minimum: number; maximum: number }> = {};
  for (const k of keys) properties[k] = { type: 'number', minimum: 0, maximum: 1 };
  return { type: 'object', additionalProperties: false, properties };
}

// Standard A+ tail shared by every intelligence response (no financial_disclaimer —
// these are non-finance APIs). Used as an allOf branch, so no additionalProperties here.
export const Tail = {
  type: 'object',
  required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
    execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};

/** Build the standard DiscoveryResponse schema (GET / payload). */
export function discoverySchema() {
  return {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  };
}

/** The common schema bag every non-finance A+ spec needs. Spread into `schemas`. */
export function baseSchemas() {
  return { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, DiscoveryResponse: discoverySchema() };
}
