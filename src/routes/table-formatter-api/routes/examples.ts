// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.
export const markdownExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "format": "markdown",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "right"
  ],
  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 markdown table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
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
export const asciiExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "format": "ascii",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "left"
  ],
  "table": "+-------+----------+---------+\n| name  | role     | commits |\n+-------+----------+---------+\n| Alice | Engineer | 142     |\n| Bob   | Designer | 37      |\n+-------+----------+---------+",
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 ascii table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
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
  "format": "markdown",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "right"
  ],
  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
  "reasoning": {
    "why_result_generated": "Rendered 2 row(s) across 3 column(s) as a markdown table.",
    "key_factors": [
      "Columns: name, role, commits.",
      "Rows: 2.",
      "Alignment: left, left, right."
    ],
    "invalidators": [
      "Cells are stringified deterministically: strings verbatim, numbers/booleans via String(), null/undefined → empty, objects/arrays → compact JSON. Newlines within a cell are replaced by a single space (Markdown/ASCII tables are single-line per cell).",
      "Markdown rendering escapes literal \"|\" as \"\\|\"; ASCII rendering pads columns to the widest cell. Alignment (\"align\") affects the Markdown separator row and ASCII padding only.",
      "When \"columns\" is omitted, columns are the union of object keys in first-seen order; array rows REQUIRE an explicit \"columns\" header list. Missing keys render as empty cells, not errors."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 markdown table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
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
