// AUTO-GENERATED from live output by x402-test/gen-groupb-converters-examples.mjs — do not hand-edit.
export const toJsonExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "json": {
    "note": {
      "to": "Ada",
      "body": "Hi",
      "@_id": 1
    }
  },
  "source_length": 47,
  "root_elements": [
    "note"
  ],
  "attributes_preserved": true,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed XML into JSON with 1 root element(s)."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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
export const toXmlExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "xml": "<note id=\"1\">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n",
  "xml_length": 55,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Serialized JSON into 55 characters of XML."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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
  "json": {
    "note": {
      "to": "Ada",
      "body": "Hi",
      "@_id": 1
    }
  },
  "source_length": 47,
  "root_elements": [
    "note"
  ],
  "attributes_preserved": true,
  "reasoning": {
    "why_result_generated": "Validated the input as well-formed XML and parsed it into JSON with 1 root element(s), preserving attributes under the \"@_\" prefix.",
    "key_factors": [
      "Source length: 47 chars.",
      "Root elements: note.",
      "Attributes preserved: true."
    ],
    "invalidators": [
      "XML attributes are preserved on the JSON side with the \"@_\" prefix (e.g. <a id=\"1\"/> → {\"a\":{\"@_id\":\"1\"}}); set preserve_attributes:false on /to-json to drop them.",
      "Conversion follows the fast-xml-parser data model: repeated sibling elements collapse into an array, text content uses the \"#text\" key alongside attributes, and the model is NOT guaranteed to round-trip byte-for-byte (whitespace, comments, CDATA framing and namespace prefixes may shift).",
      "/to-xml requires a JSON object at the top level; arrays or scalars are rejected. Numeric/boolean attribute values are parsed on the way in."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed XML into JSON with 1 root element(s)."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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
