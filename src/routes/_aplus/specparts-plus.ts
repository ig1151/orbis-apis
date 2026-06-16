// "Plus" spec fragments + runtime metadata used ONLY by the Group B batch-2 dev-tools
// (color-converter, case-converter, url-tools, glob-to-regex, jsonpath). These layer
// a few A+ marketplace niceties on top of the shared specparts WITHOUT changing the
// fleet-wide scaffold:
//   - request_id is REQUIRED (the runtime already always emits it),
//   - execution_metadata carries side_effects + estimated_compute_class,
//   - discovery advertises a machine-readable capabilities[] array.
// Each spec is self-contained, so registering these under the canonical schema names
// (EnvelopeOk / ExecutionMetadata / Error400 / DiscoveryResponse) makes the shared
// _Tail $refs resolve to them within that one spec only.

import { EnvelopeOk, ExecutionMetadata, discoverySchema } from './specparts';

// EnvelopeOk with request_id promoted to required.
export const EnvelopeOkPlus = {
  ...EnvelopeOk,
  required: [...EnvelopeOk.required, 'request_id'],
};

// Error envelope with request_id required (the runtime fail() always emits it).
export const Error400Plus = {
  type: 'object',
  required: ['trace_id', 'request_id', 'computed_at', 'success', 'latency_ms', 'error'],
  additionalProperties: false,
  properties: {
    trace_id: { type: 'string' },
    request_id: { type: 'string', description: 'Alias of trace_id.' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [false] },
    latency_ms: { type: 'integer' },
    error: { $ref: '#/components/schemas/EnvelopeError' },
  },
};

// execution_metadata enriched with agent-planning hints (all honest + deterministic).
export const ExecutionMetadataPlus = {
  type: 'object',
  required: ['model', 'automation_safe', 'side_effects', 'estimated_compute_class'],
  additionalProperties: false,
  properties: {
    model: { type: 'string', enum: ['deterministic'] },
    automation_safe: { type: 'boolean' },
    side_effects: { type: 'boolean', description: 'Whether a call mutates external state (always false — pure computation).' },
    estimated_compute_class: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Rough CPU cost band for planning.' },
  },
};

// Discovery schema that also advertises a capabilities[] list (additive — keeps the
// canonical name/version/description/endpoints/pricing fleet shape).
export function discoverySchemaPlus() {
  const base = discoverySchema() as any;
  return {
    ...base,
    required: [...base.required, 'capabilities'],
    properties: {
      ...base.properties,
      capabilities: { type: 'array', items: { type: 'string' }, description: 'Machine-readable capability tags for agent matching.' },
    },
  };
}

// Runtime metadata object (mirrors ExecutionMetadataPlus). Compute class is 'low' for
// all five tools — pure, sub-millisecond string/JSON computation, no I/O.
export const EXECUTION_METADATA_PLUS = {
  model: 'deterministic' as const,
  automation_safe: true,
  side_effects: false,
  estimated_compute_class: 'low' as const,
};
