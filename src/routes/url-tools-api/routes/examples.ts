// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.
export const parseExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag",
  "components": {
    "href": "https://user:pw@example.com/a//b?z=2&a=1&a=3#frag",
    "protocol": "https:",
    "username": "user",
    "password": "pw",
    "host": "example.com",
    "hostname": "example.com",
    "port": "",
    "origin": "https://example.com",
    "pathname": "/a//b",
    "path_segments": [
      "a",
      "b"
    ],
    "search": "?z=2&a=1&a=3",
    "query": {
      "z": "2",
      "a": [
        "1",
        "3"
      ]
    },
    "hash": "#frag"
  },
  "normalized": "https://user:pw@example.com/a//b?a=1&a=3&z=2#frag",
  "confidence_score": 1,
  "confidence_per_section": {
    "parse": 1
  },
  "recommended_actions_priority_order": [
    "Parsed https://example.com/a//b with 2 query key(s)."
  ],
  "chain_to": [
    {
      "api": "web-content-type-classifier",
      "reason": "Classify the resource a built/parsed URL points to."
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
export const buildExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "href": "https://api.example.com/v1/search?q=agent+native&page=2&tag=a&tag=b",
  "components": {
    "href": "https://api.example.com/v1/search?q=agent+native&page=2&tag=a&tag=b",
    "protocol": "https:",
    "username": "",
    "password": "",
    "host": "api.example.com",
    "hostname": "api.example.com",
    "port": "",
    "origin": "https://api.example.com",
    "pathname": "/v1/search",
    "path_segments": [
      "v1",
      "search"
    ],
    "search": "?q=agent+native&page=2&tag=a&tag=b",
    "query": {
      "q": "agent native",
      "page": "2",
      "tag": [
        "a",
        "b"
      ]
    },
    "hash": ""
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "build": 1
  },
  "recommended_actions_priority_order": [
    "Built https://api.example.com/v1/search?q=agent+native&page=2&tag=a&tag=b."
  ],
  "chain_to": [
    {
      "api": "web-content-type-classifier",
      "reason": "Classify the resource a built/parsed URL points to."
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
  "input": "https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag",
  "components": {
    "href": "https://user:pw@example.com/a//b?z=2&a=1&a=3#frag",
    "protocol": "https:",
    "username": "user",
    "password": "pw",
    "host": "example.com",
    "hostname": "example.com",
    "port": "",
    "origin": "https://example.com",
    "pathname": "/a//b",
    "path_segments": [
      "a",
      "b"
    ],
    "search": "?z=2&a=1&a=3",
    "query": {
      "z": "2",
      "a": [
        "1",
        "3"
      ]
    },
    "hash": "#frag"
  },
  "normalized": "https://user:pw@example.com/a//b?a=1&a=3&z=2#frag",
  "reasoning": {
    "why_result_generated": "Parsed \"https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag\" with the WHATWG URL parser and produced a conservative canonical form.",
    "key_factors": [
      "Origin: https://example.com.",
      "Path segments: 2; query keys: 2.",
      "Normalized: https://user:pw@example.com/a//b?a=1&a=3&z=2#frag."
    ],
    "invalidators": [
      "Parsing follows the WHATWG URL Standard (the same parser browsers use); component values are exact. Relative URLs require a \"base\" to resolve.",
      "The query object collapses a single occurrence of a key to a string and multiple occurrences to an array — order within an array is preserved, but two semantically different encodings (e.g. \"a=1&a=2\" vs \"a[]=1&a[]=2\") are NOT unified.",
      "Normalization lowercases scheme+host (per the URL spec), drops the protocol default port, sorts query params by key then value, and trims an empty \"?\"/\"#\". It does NOT collapse \".\" / \"..\" path segments beyond what the URL parser already resolves, nor change path case or percent-encoding — so it is a conservative canonical form, not an aggressive one."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "parse": 1
  },
  "recommended_actions_priority_order": [
    "Normalized to https://user:pw@example.com/a//b?a=1&a=3&z=2#frag."
  ],
  "chain_to": [
    {
      "api": "web-content-type-classifier",
      "reason": "Classify the resource a built/parsed URL points to."
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
