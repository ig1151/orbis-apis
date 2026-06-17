// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.
export const encodeExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "Tom & Jerry <3 \"quotes\" — café",
  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "mode": "non_ascii",
  "numeric": false,
  "replaced_count": 6,
  "confidence_score": 1,
  "confidence_per_section": {
    "encoding": 1
  },
  "recommended_actions_priority_order": [
    "Encoded 6 character(s) to HTML entities."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
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
export const decodeExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "decoded": "Tom & Jerry <3 \"quotes\" — café",
  "replaced_count": 6,
  "confidence_score": 1,
  "confidence_per_section": {
    "decoding": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 6 entity reference(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
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
  "input": "Tom & Jerry <3 \"quotes\" — café",
  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "mode": "non_ascii",
  "numeric": false,
  "replaced_count": 6,
  "reasoning": {
    "why_result_generated": "Escaped 6 character(s) in non_ascii mode (numeric=false); the result is safe to embed in HTML text content.",
    "key_factors": [
      "Mode: non_ascii.",
      "Numeric special chars: false.",
      "Characters replaced: 6."
    ],
    "invalidators": [
      "/encode (minimal) escapes only the five HTML-special characters & < > \" '. In non_ascii mode it additionally escapes every codepoint > 127 as a numeric reference. The single quote is emitted as &#39; (numeric) in named mode for maximum HTML compatibility.",
      "/decode resolves ALL numeric references (&#NN; decimal and &#xHH; hex) and a curated set of common named entities. An unrecognized named entity (e.g. a rare HTML5 ref not in the set) is left verbatim — it is NOT an error and is not counted in replaced_count.",
      "Encoding is reversible by /decode for everything it produces. Decoding is not guaranteed to round-trip back to the exact original markup because multiple inputs (named vs numeric for the same character) decode to the same text."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "encoding": 1
  },
  "recommended_actions_priority_order": [
    "Encoded 6 character(s) to HTML entities."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
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
