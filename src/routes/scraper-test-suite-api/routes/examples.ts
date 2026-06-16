// AUTO-GENERATED from live output by x402-test/gen-b4-examples.mjs — do not hand-edit.
// Regenerate after changing the route: start the server, run capture-b4.mjs then gen-b4-examples.mjs.
export const runExample = {
  "trace_id": "sts-1780000000000",
  "request_id": "sts-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "test_count": 4,
  "passed_count": 4,
  "failed_count": 0,
  "all_passed": true,
  "score": 100,
  "grade": "A",
  "results": [
    {
      "name": "title_text",
      "selector": "h1.title",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "Hello World",
      "sample_values": [
        "Hello World"
      ],
      "assertions": [
        {
          "type": "exists",
          "expected": true,
          "actual": true,
          "pass": true
        },
        {
          "type": "count",
          "expected": 1,
          "actual": 1,
          "pass": true
        },
        {
          "type": "equals",
          "expected": "Hello World",
          "actual": "Hello World",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "nav_links",
      "selector": "a.nav",
      "extraction_mode": "attr:href",
      "matched_count": 2,
      "extracted_value": "/about",
      "sample_values": [
        "/about",
        "/contact"
      ],
      "assertions": [
        {
          "type": "min_count",
          "expected": 2,
          "actual": 2,
          "pass": true
        },
        {
          "type": "non_empty",
          "expected": true,
          "actual": true,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "price_format",
      "selector": "p.price",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "$19.99",
      "sample_values": [
        "$19.99"
      ],
      "assertions": [
        {
          "type": "matches",
          "expected": "^\\$\\d+\\.\\d{2}$",
          "actual": "$19.99",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "no_banner",
      "selector": ".promo-banner",
      "extraction_mode": "text",
      "matched_count": 0,
      "extracted_value": null,
      "sample_values": [],
      "assertions": [
        {
          "type": "exists",
          "expected": false,
          "actual": false,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "extraction": 1,
    "assertions": 1
  },
  "recommended_actions_priority_order": [
    "4/4 test(s) passed — score 100/100 (A), ALL PASSED."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the records these selectors extract against an expected schema across many pages."
    },
    {
      "api": "website-structure-mapper",
      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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
  "trace_id": "sts-1780000000000",
  "request_id": "sts-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "test_count": 4,
  "passed_count": 4,
  "failed_count": 0,
  "all_passed": true,
  "score": 100,
  "grade": "A",
  "results": [
    {
      "name": "title_text",
      "selector": "h1.title",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "Hello World",
      "sample_values": [
        "Hello World"
      ],
      "assertions": [
        {
          "type": "exists",
          "expected": true,
          "actual": true,
          "pass": true
        },
        {
          "type": "count",
          "expected": 1,
          "actual": 1,
          "pass": true
        },
        {
          "type": "equals",
          "expected": "Hello World",
          "actual": "Hello World",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "nav_links",
      "selector": "a.nav",
      "extraction_mode": "attr:href",
      "matched_count": 2,
      "extracted_value": "/about",
      "sample_values": [
        "/about",
        "/contact"
      ],
      "assertions": [
        {
          "type": "min_count",
          "expected": 2,
          "actual": 2,
          "pass": true
        },
        {
          "type": "non_empty",
          "expected": true,
          "actual": true,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "price_format",
      "selector": "p.price",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "$19.99",
      "sample_values": [
        "$19.99"
      ],
      "assertions": [
        {
          "type": "matches",
          "expected": "^\\$\\d+\\.\\d{2}$",
          "actual": "$19.99",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "no_banner",
      "selector": ".promo-banner",
      "extraction_mode": "text",
      "matched_count": 0,
      "extracted_value": null,
      "sample_values": [],
      "assertions": [
        {
          "type": "exists",
          "expected": false,
          "actual": false,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    }
  ],
  "reasoning": {
    "why_result_generated": "Ran 4 selector test(s) against the supplied HTML: 4 passed, 0 failed (score 100/100).",
    "key_factors": [
      "Result: ALL PASSED (grade A).",
      "Failing test(s): none.",
      "Selector error(s): none."
    ],
    "invalidators": [
      "Tests run only against the supplied HTML snapshot — they prove a selector works on this capture, not on the live (possibly changed) page.",
      "HTML is parsed leniently by cheerio (like a browser): malformed markup is auto-corrected, so a selector may match more/less than a strict parser would.",
      "Text extraction uses the concatenated text of all descendants, trimmed; attribute extraction reads the first matched element’s attribute (null if absent).",
      "Regex assertions are safety-bounded: patterns over 300 chars or with nested unbounded quantifiers (e.g. (a+)+) are rejected, and the pattern is tested against at most the first 8192 chars of the extracted value (an input bound limiting catastrophic-backtracking cost on the single-threaded engine)."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "extraction": 1,
    "assertions": 1
  },
  "recommended_actions_priority_order": [
    "4/4 test(s) passed — score 100/100 (A), ALL PASSED."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the records these selectors extract against an expected schema across many pages."
    },
    {
      "api": "website-structure-mapper",
      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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
