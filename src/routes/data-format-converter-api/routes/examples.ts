// AUTO-GENERATED from live output by x402-test/gen-groupb-converters-examples.mjs — do not hand-edit.
export const convertExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "from": "toml",
  "to": "json",
  "value_type": "object",
  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
  "output_length": 36,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Converted toml → json (36 chars)."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
export const detectExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "detected_format": "yaml",
  "parses_as": {
    "json": false,
    "yaml": true,
    "toml": false
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "detection": 1
  },
  "recommended_actions_priority_order": [
    "Input parses as yaml."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
export const lookupExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "from": "toml",
  "to": "json",
  "value_type": "object",
  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
  "output_length": 36,
  "reasoning": {
    "why_result_generated": "Parsed the input as toml (top-level object) and re-serialized it as json, producing 36 character(s).",
    "key_factors": [
      "Source format: toml.",
      "Target format: json.",
      "Top-level value type: object."
    ],
    "invalidators": [
      "Conversion is structural: it round-trips the parsed data model, not byte-for-byte formatting. Comments, key ordering nuances, anchors/aliases, and whitespace are NOT preserved.",
      "TOML can only represent a top-level table (object) with no null values; converting an array, scalar, or a structure containing null TO toml fails with an explicit error.",
      "YAML is a superset of JSON, so a pure-JSON document also parses as YAML; /detect therefore reports json first when the input is valid JSON."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Converted toml → json (36 chars)."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
};
