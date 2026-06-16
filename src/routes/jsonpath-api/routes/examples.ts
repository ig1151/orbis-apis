// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.
export const queryExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "path": "$.store.book[*].title",
  "match_count": 2,
  "matches": [
    {
      "path": "$['store']['book'][0]['title']",
      "value": "A"
    },
    {
      "path": "$['store']['book'][1]['title']",
      "value": "B"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "query": 1
  },
  "recommended_actions_priority_order": [
    "2 match(es) for $.store.book[*].title."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve a single matched path as an exact RFC 6901 pointer."
    },
    {
      "api": "json-patch",
      "reason": "Apply an RFC 6902 patch at a located path."
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
export const valueExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "path": "$..book[-1].title",
  "found": true,
  "value": "B",
  "matched_path": "$['store']['book'][1]['title']",
  "match_count": 1,
  "confidence_score": 1,
  "confidence_per_section": {
    "query": 1
  },
  "recommended_actions_priority_order": [
    "First match at $['store']['book'][1]['title']."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve a single matched path as an exact RFC 6901 pointer."
    },
    {
      "api": "json-patch",
      "reason": "Apply an RFC 6902 patch at a located path."
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
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "path": "$.store.book[*].title",
  "match_count": 2,
  "matches": [
    {
      "path": "$['store']['book'][0]['title']",
      "value": "A"
    },
    {
      "path": "$['store']['book'][1]['title']",
      "value": "B"
    }
  ],
  "reasoning": {
    "why_result_generated": "Parsed JSONPath \"$.store.book[*].title\" into its selector steps and evaluated it against the document in document order, yielding 2 match(es).",
    "key_factors": [
      "Match count: 2.",
      "First path: $['store']['book'][0]['title']."
    ],
    "invalidators": [
      "Supported JSONPath subset: $ (root), .name and ['name'] (child), * and [*] (wildcard), .. (recursive descent), [n] (index, negative allowed), [start:end:step] (slice, Python-style, negative/step), and unions [0,2] / ['a','b']. Evaluation is exact within this subset.",
      "NOT supported: filter expressions [?(@.price<10)], script expressions [(...)], and current-node (@) references. Such a path is rejected with a parse error rather than silently mis-evaluated.",
      "Match ORDER follows document order (object keys in insertion order, array indices ascending); recursive descent visits a node before its children. Unions preserve the order written. Duplicate matches from overlapping unions are NOT de-duplicated.",
      "Matched paths are emitted in normalized bracket form ($['a'][0]); object keys are quoted, array indices are bracketed integers."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "query": 1
  },
  "recommended_actions_priority_order": [
    "2 match(es) for $.store.book[*].title."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve a single matched path as an exact RFC 6901 pointer."
    },
    {
      "api": "json-patch",
      "reason": "Apply an RFC 6902 patch at a located path."
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
