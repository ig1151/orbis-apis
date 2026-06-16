// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.
// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.
export const resolveExample = {
  "trace_id": "jptr-1780000000000",
  "request_id": "jptr-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "document_type": "object",
  "requested": 7,
  "found_count": 5,
  "missing_count": 2,
  "results": [
    {
      "pointer": "/user/name",
      "found": true,
      "value": "Ada",
      "type": "string"
    },
    {
      "pointer": "/user/roles/0",
      "found": true,
      "value": "admin",
      "type": "string"
    },
    {
      "pointer": "/user/a~1b",
      "found": true,
      "value": 1,
      "type": "number"
    },
    {
      "pointer": "/items/1",
      "found": true,
      "value": 20,
      "type": "number"
    },
    {
      "pointer": "/active",
      "found": true,
      "value": null,
      "type": "null"
    },
    {
      "pointer": "/user/missing",
      "found": false,
      "reason": "key \"missing\" at index 1 does not exist."
    },
    {
      "pointer": "/items/5",
      "found": false,
      "reason": "array index 5 at index 1 is out of bounds (length 2)."
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "resolution": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 5/7 pointer(s); 2 not found."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
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

export const enumerateExample = {
  "trace_id": "jptr-1780000000000",
  "request_id": "jptr-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "document_type": "object",
  "leaf_count": 5,
  "truncated": false,
  "entries": [
    {
      "pointer": "/user/name",
      "value": "Ada",
      "type": "string"
    },
    {
      "pointer": "/user/active",
      "value": true,
      "type": "boolean"
    },
    {
      "pointer": "/tags/0",
      "value": "x",
      "type": "string"
    },
    {
      "pointer": "/tags/1",
      "value": "y",
      "type": "string"
    },
    {
      "pointer": "/meta",
      "value": {},
      "type": "object"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "enumeration": 1
  },
  "recommended_actions_priority_order": [
    "Enumerated 5 leaf pointer(s)."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
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
  "trace_id": "jptr-1780000000000",
  "request_id": "jptr-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "document_type": "object",
  "requested": 7,
  "found_count": 5,
  "missing_count": 2,
  "results": [
    {
      "pointer": "/user/name",
      "found": true,
      "value": "Ada",
      "type": "string"
    },
    {
      "pointer": "/user/roles/0",
      "found": true,
      "value": "admin",
      "type": "string"
    },
    {
      "pointer": "/user/a~1b",
      "found": true,
      "value": 1,
      "type": "number"
    },
    {
      "pointer": "/items/1",
      "found": true,
      "value": 20,
      "type": "number"
    },
    {
      "pointer": "/active",
      "found": true,
      "value": null,
      "type": "null"
    },
    {
      "pointer": "/user/missing",
      "found": false,
      "reason": "key \"missing\" at index 1 does not exist."
    },
    {
      "pointer": "/items/5",
      "found": false,
      "reason": "array index 5 at index 1 is out of bounds (length 2)."
    }
  ],
  "reasoning": {
    "why_result_generated": "Resolved 7 JSON Pointer(s) against a object document: 5 found, 2 missing.",
    "key_factors": [
      "Found: /user/name, /user/roles/0, /user/a~1b, /items/1, /active.",
      "Missing: /user/missing (key \"missing\" at index 1 does not exist.); /items/5 (array index 5 at index 1 is out of bounds (length 2).)."
    ],
    "invalidators": [
      "Pointers follow RFC 6901: tokens are ~1→\"/\" and ~0→\"~\" unescaped; array indices must be \"0\" or have no leading zeros; \"-\" (end-of-array) is reported as not-found because it addresses no existing element.",
      "A pointer is \"not found\" (not an error) when the path does not exist in this document; only malformed pointers (not starting with \"/\") are reported via reason without a value.",
      "Resolution reflects only the supplied document; a value of null is a real found value, distinguished from missing by the found flag."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "resolution": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 5/7 pointer(s); 2 not found."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
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

