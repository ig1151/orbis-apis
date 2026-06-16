// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.
export const convertExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "glob": "src/**/*.{ts,tsx}",
  "regex_source": "src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)",
  "regex": "^src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)$",
  "flags": "",
  "options": {
    "globstar": true,
    "nocase": false
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Translated glob to /^src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)$/."
  ],
  "chain_to": [
    {
      "api": "regex-tester",
      "reason": "Run or further analyze the generated regular expression against more inputs."
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
export const testExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "glob": "src/**/*.{ts,tsx}",
  "regex_source": "src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)",
  "regex": "^src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)$",
  "flags": "",
  "options": {
    "globstar": true,
    "nocase": false
  },
  "matched_count": 2,
  "results": [
    {
      "path": "src/index.ts",
      "matched": true
    },
    {
      "path": "src/routes/a/b.tsx",
      "matched": true
    },
    {
      "path": "src/x.js",
      "matched": false
    },
    {
      "path": "README.md",
      "matched": false
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1,
    "matching": 1
  },
  "recommended_actions_priority_order": [
    "2/4 path(s) matched glob \"src/**/*.{ts,tsx}\"."
  ],
  "chain_to": [
    {
      "api": "regex-tester",
      "reason": "Run or further analyze the generated regular expression against more inputs."
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
  "glob": "src/**/*.{ts,tsx}",
  "regex_source": "src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)",
  "regex": "^src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)$",
  "flags": "",
  "options": {
    "globstar": true,
    "nocase": false
  },
  "matched_count": 2,
  "results": [
    {
      "path": "src/index.ts",
      "matched": true
    },
    {
      "path": "src/routes/a/b.tsx",
      "matched": true
    },
    {
      "path": "src/x.js",
      "matched": false
    },
    {
      "path": "README.md",
      "matched": false
    }
  ],
  "reasoning": {
    "why_result_generated": "Translated glob \"src/**/*.{ts,tsx}\" to the anchored regex /^src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)$/ and tested 4 path(s); 2 matched.",
    "key_factors": [
      "Regex source: src\\/(?:.*/)?[^/]*\\.(?:ts|tsx)",
      "globstar=true, nocase=false.",
      "Matched: 2/4."
    ],
    "invalidators": [
      "Translation targets ECMAScript regex and matches a WHOLE path (the regex is anchored ^…$). Supported glob syntax: * (any run of non-slash chars), ** (any chars incl. slash, when globstar is on), ? (one non-slash char), [abc]/[a-z]/[!abc] classes, {a,b,c} brace alternation, and \\ escaping.",
      "The generated regex uses only bounded/possessive-free constructs with no nested unbounded quantifiers, so it cannot exhibit catastrophic backtracking — it is ReDoS-safe by construction.",
      "NOT supported: nested braces, POSIX class names ([[:alpha:]]), extglob (+(...)/@(...)), and brace numeric ranges ({1..3}). Path separators are treated literally as \"/\"; backslash is an escape, not a Windows separator. With globstar off, ** behaves like *."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1,
    "matching": 1
  },
  "recommended_actions_priority_order": [
    "2/4 path(s) matched."
  ],
  "chain_to": [
    {
      "api": "regex-tester",
      "reason": "Run or further analyze the generated regular expression against more inputs."
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
