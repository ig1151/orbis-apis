// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.
// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.
export const applyExample = {
  "trace_id": "jpat-1780000000000",
  "request_id": "jpat-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "operation_count": 4,
  "applied": true,
  "document": {
    "roles": [
      "admin",
      "editor"
    ],
    "age": 31
  },
  "test_results": [
    {
      "index": 2,
      "path": "/roles/0",
      "passed": true
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "apply": 1
  },
  "recommended_actions_priority_order": [
    "Applied all 4 operation(s)."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};

export const diffExample = {
  "trace_id": "jpat-1780000000000",
  "request_id": "jpat-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "operation_count": 4,
  "patch": [
    {
      "op": "remove",
      "path": "/c"
    },
    {
      "op": "replace",
      "path": "/a",
      "value": 2
    },
    {
      "op": "add",
      "path": "/b/-",
      "value": 3
    },
    {
      "op": "add",
      "path": "/d",
      "value": true
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "diff": 1
  },
  "recommended_actions_priority_order": [
    "Generated a 4-operation patch transforming from→to."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};

export const lookupExample = {
  "trace_id": "jpat-1780000000000",
  "request_id": "jpat-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "operation_count": 4,
  "applied": true,
  "document": {
    "roles": [
      "admin",
      "editor"
    ],
    "age": 31
  },
  "test_results": [
    {
      "index": 2,
      "path": "/roles/0",
      "passed": true
    }
  ],
  "reasoning": {
    "why_result_generated": "Applied 4 operation(s) atomically; 1 test op(s) evaluated.",
    "key_factors": [
      "Applied: true.",
      "Test ops: /roles/0=pass."
    ],
    "invalidators": [
      "Patches apply atomically per RFC 6902: on the first failing operation (bad path, out-of-bounds index, missing target, or failed test) the whole patch is rejected and no document is returned.",
      "The input document is never mutated — operations run on a deep clone; \"move into own subtree\" is rejected as illegal.",
      "diff is deterministic and correct (applying it transforms from→to) but not guaranteed minimal: array changes are compared index-wise, so an insertion mid-array may yield replace+append rather than a single insert.",
      "Whole-document operations: add/replace with path \"\" replace the entire document; remove with path \"\" is rejected BY DESIGN (RFC 6902 removes a value from its parent, and the root has no parent) — to empty a document, replace at \"\" with the desired value."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "apply": 1
  },
  "recommended_actions_priority_order": [
    "Applied all 4 operation(s)."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
};

