// AUTO-GENERATED from live output by x402-test/gen-b4-examples.mjs — do not hand-edit.
// Regenerate after changing the route: start the server, run capture-b4.mjs then gen-b4-examples.mjs.
export const scoreExample = {
  "trace_id": "sdq-1780000000000",
  "request_id": "sdq-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 5,
  "column_count": 4,
  "total_cells": 20,
  "duplicate_row_count": 1,
  "placeholder_cell_count": 2,
  "noise_cell_count": 3,
  "missing_cell_count": 1,
  "subscores": {
    "completeness": 0.95,
    "uniqueness": 0.8,
    "cleanliness": 0.85,
    "placeholder_freedom": 0.9,
    "consistency": 0.95
  },
  "score": 89.8,
  "grade": "B",
  "weights_used": {
    "completeness": 0.3,
    "uniqueness": 0.15,
    "cleanliness": 0.2,
    "placeholder_freedom": 0.2,
    "consistency": 0.15
  },
  "fields": [
    {
      "name": "title",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0.6,
      "truncated_count": 1,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "price",
      "fill_rate": 0.8,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "url",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "stock",
      "fill_rate": 1,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "number",
      "type_consistency": 0.8
    }
  ],
  "issues": [
    "1 duplicate row(s) (20.0%) — likely double-extraction.",
    "Column \"title\": 60.0% noisy values (whitespace/HTML entities/control chars/truncation).",
    "Column \"price\": only 80.0% of rows populated.",
    "Column \"price\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": mixed value types (dominant number only 80.0% consistent)."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "measurement": 1,
    "scoring": 0.8
  },
  "recommended_actions_priority_order": [
    "Quality score 89.8/100 (B) over 5 row(s) × 4 column(s).",
    "Weakest dimension(s): uniqueness 80%, cleanliness 85%.",
    "De-duplicate: 1 duplicate row(s) detected.",
    "6 field issue(s) flagged — see issues[].",
    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
    },
    {
      "api": "scrape-data-enricher",
      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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
  "trace_id": "sdq-1780000000000",
  "request_id": "sdq-1780000000000",
  "computed_at": "2026-06-15T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 5,
  "column_count": 4,
  "total_cells": 20,
  "duplicate_row_count": 1,
  "placeholder_cell_count": 2,
  "noise_cell_count": 3,
  "missing_cell_count": 1,
  "subscores": {
    "completeness": 0.95,
    "uniqueness": 0.8,
    "cleanliness": 0.85,
    "placeholder_freedom": 0.9,
    "consistency": 0.95
  },
  "score": 89.8,
  "grade": "B",
  "weights_used": {
    "completeness": 0.3,
    "uniqueness": 0.15,
    "cleanliness": 0.2,
    "placeholder_freedom": 0.2,
    "consistency": 0.15
  },
  "fields": [
    {
      "name": "title",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0.6,
      "truncated_count": 1,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "price",
      "fill_rate": 0.8,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "url",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "stock",
      "fill_rate": 1,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "number",
      "type_consistency": 0.8
    }
  ],
  "issues": [
    "1 duplicate row(s) (20.0%) — likely double-extraction.",
    "Column \"title\": 60.0% noisy values (whitespace/HTML entities/control chars/truncation).",
    "Column \"price\": only 80.0% of rows populated.",
    "Column \"price\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": mixed value types (dominant number only 80.0% consistent)."
  ],
  "reasoning": {
    "why_result_generated": "Scored 5 row(s) × 4 column(s): 89.8/100 (B).",
    "key_factors": [
      "Subscores — completeness 0.95, uniqueness 0.8, cleanliness 0.85, placeholder_freedom 0.9, consistency 0.95.",
      "1 missing, 2 placeholder, 3 noisy cell(s); 1 duplicate row(s).",
      "Issues flagged: 6."
    ],
    "invalidators": [
      "This scores intrinsic, schema-free quality of already-extracted data; it does NOT compare against an expected schema (use scrape-data-pipeline-validator) or score pipeline health (use data-pipeline-quality-scorer).",
      "Placeholder detection matches a fixed token list (n/a, null, —, …, lorem ipsum, etc.); domain-specific sentinels (e.g. \"0\", \"999\") are NOT treated as placeholders.",
      "Noise = leading/trailing whitespace, HTML entities (&amp;), control characters, or truncation markers (…/...); decoded-but-wrong text cannot be detected.",
      "Type consistency folds integers into \"number\"; the overall score is a weighted blend (weights_used) — a heuristic, not a certified quality guarantee."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "measurement": 1,
    "scoring": 0.8
  },
  "recommended_actions_priority_order": [
    "Quality score 89.8/100 (B) over 5 row(s) × 4 column(s).",
    "Weakest dimension(s): uniqueness 80%, cleanliness 85%.",
    "De-duplicate: 1 duplicate row(s) detected.",
    "6 field issue(s) flagged — see issues[].",
    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
    },
    {
      "api": "scrape-data-enricher",
      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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
