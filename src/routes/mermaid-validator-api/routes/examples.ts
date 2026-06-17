// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.
export const validateExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "diagram_type": "flowchart",
  "valid": true,
  "line_count": 4,
  "content_line_count": 4,
  "balanced_delimiters": true,
  "node_count": 3,
  "edge_count": 3,
  "issues": [],
  "confidence_score": 0.9,
  "confidence_per_section": {
    "structure": 1,
    "grammar": 0.8
  },
  "recommended_actions_priority_order": [
    "No structural errors found in flowchart."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render the issue list as a Markdown table for a PR comment or report."
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
  "diagram_type": "flowchart",
  "valid": true,
  "line_count": 4,
  "content_line_count": 4,
  "balanced_delimiters": true,
  "node_count": 3,
  "edge_count": 3,
  "issues": [],
  "reasoning": {
    "why_result_generated": "Detected diagram type \"flowchart\"; delimiters balanced; found 0 error(s) and 0 warning(s) across 4 content line(s).",
    "key_factors": [
      "Diagram type: flowchart.",
      "Balanced delimiters: true.",
      "Nodes: 3, edges: 3."
    ],
    "invalidators": [
      "This is a LEXICAL/STRUCTURAL lint, not the Mermaid parser: it reliably detects the diagram type, unbalanced delimiters ( ) [ ] { }, unterminated quotes, and (for flowcharts) dangling/unrecognized lines. It does NOT fully validate the Mermaid grammar, so valid:true means \"no structural problems found\", not \"guaranteed to render\".",
      "node_count and edge_count are reported only for flowchart/graph diagrams and are derived from arrow tokens and node identifiers via tokenization; subgraph headers, styling, and click directives are excluded from the node count.",
      "Comments (lines beginning with %%) and %%{...}%% init directives are ignored. Double-quoted labels are not expected to span multiple lines; an unclosed quote on a line is flagged."
    ]
  },
  "confidence_score": 0.9,
  "confidence_per_section": {
    "structure": 1,
    "grammar": 0.8
  },
  "recommended_actions_priority_order": [
    "No structural errors found."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render the issue list as a Markdown table for a PR comment or report."
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
