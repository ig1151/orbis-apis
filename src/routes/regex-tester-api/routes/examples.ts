// AUTO-GENERATED from live output by x402-test/gen-regex-examples.mjs — do not hand-edit.
// Regenerate: start the server on :3939, then run gen-regex-examples.mjs.
export const analyzeExample = {
  "trace_id": "regx-1780000000000",
  "request_id": "regx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "pattern": "(?<year>\\d{4})-(\\d{2})",
  "flags": "",
  "valid": true,
  "compile_error": null,
  "capture_groups": 2,
  "named_groups": [
    "year"
  ],
  "anchored_start": false,
  "anchored_end": false,
  "features": {
    "has_alternation": false,
    "has_lookahead": false,
    "has_lookbehind": false,
    "has_backreference": false,
    "has_quantifier": true,
    "has_character_class": false
  },
  "catastrophic_risk": false,
  "risk_reason": "No nested-unbounded-quantifier structure detected by the static guard.",
  "confidence_score": 0.9,
  "confidence_per_section": {
    "validity": 1,
    "structure": 1,
    "safety": 0.7
  },
  "recommended_actions_priority_order": [
    "Pattern is valid with 2 capture group(s) (named: year)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Apply this validated pattern as a \"regex\" rule across an entire dataset."
    },
    {
      "api": "scraper-test-suite",
      "reason": "Use this pattern in a \"matches\" selector assertion against scraped HTML."
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
  "trace_id": "regx-1780000000000",
  "request_id": "regx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "pattern": "(\\w+)@(\\w+)",
  "flags": "g",
  "global": true,
  "input_count": 2,
  "total_matches": 2,
  "any_matched": true,
  "results": [
    {
      "input_index": 0,
      "matched": true,
      "match_count": 2,
      "truncated": false,
      "matches": [
        {
          "match": "ada@dev",
          "index": 0,
          "length": 7,
          "groups": [
            "ada",
            "dev"
          ],
          "named_groups": {}
        },
        {
          "match": "grace@io",
          "index": 12,
          "length": 8,
          "groups": [
            "grace",
            "io"
          ],
          "named_groups": {}
        }
      ]
    },
    {
      "input_index": 1,
      "matched": false,
      "match_count": 0,
      "truncated": false,
      "matches": []
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "matching": 1
  },
  "recommended_actions_priority_order": [
    "Matched 1/2 input(s); 2 total match(es)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Apply this validated pattern as a \"regex\" rule across an entire dataset."
    },
    {
      "api": "scraper-test-suite",
      "reason": "Use this pattern in a \"matches\" selector assertion against scraped HTML."
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
  "trace_id": "regx-1780000000000",
  "request_id": "regx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "pattern": "(\\w+)@(\\w+)",
  "flags": "g",
  "global": true,
  "input_count": 2,
  "total_matches": 2,
  "any_matched": true,
  "results": [
    {
      "input_index": 0,
      "matched": true,
      "match_count": 2,
      "truncated": false,
      "matches": [
        {
          "match": "ada@dev",
          "index": 0,
          "length": 7,
          "groups": [
            "ada",
            "dev"
          ],
          "named_groups": {}
        },
        {
          "match": "grace@io",
          "index": 12,
          "length": 8,
          "groups": [
            "grace",
            "io"
          ],
          "named_groups": {}
        }
      ]
    },
    {
      "input_index": 1,
      "matched": false,
      "match_count": 0,
      "truncated": false,
      "matches": []
    }
  ],
  "reasoning": {
    "why_result_generated": "Ran the global pattern against 2 input(s) using the ECMAScript engine; 2 total match(es) across 1 matching input(s).",
    "key_factors": [
      "Pattern: (\\w+)@(\\w+)",
      "Flags: g; global=true.",
      "Total matches: 2."
    ],
    "invalidators": [
      "Results follow ECMAScript (JavaScript) regex semantics — backreferences, lookbehind, and unicode behavior may differ from PCRE, RE2, Python re, or Go regexp. A pattern that matches here may behave differently in another engine.",
      "Match count depends on the \"g\" (global) flag: without it /test returns at most one match per input; with it all non-overlapping matches are returned (capped at 1000 per input — \"truncated\" flags when the cap is hit).",
      "Catastrophic-backtracking detection is a conservative structural heuristic: it may flag some safe patterns and (rarely) miss exotic ones. A flagged pattern is refused by /test by design; use /analyze to inspect it without execution.",
      "Feature flags (lookahead/lookbehind/backreference/quantifier/character-class) are detected structurally and are indicative, not a full parse; capture-group counts and named-group names ARE exact."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "matching": 1
  },
  "recommended_actions_priority_order": [
    "Matched 1/2 input(s); 2 total match(es)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Apply this validated pattern as a \"regex\" rule across an entire dataset."
    },
    {
      "api": "scraper-test-suite",
      "reason": "Use this pattern in a \"matches\" selector assertion against scraped HTML."
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
