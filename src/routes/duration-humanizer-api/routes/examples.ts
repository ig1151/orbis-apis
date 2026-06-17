// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.
export const humanizeExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "milliseconds": 93784000,
  "negative": false,
  "humanized": "1 day 2 hours 3 minutes 4 seconds",
  "compact": "1d 2h 3m 4s",
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "largest_unit": "d",
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
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
export const parseExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "input": "1d 2h 3m 4s",
  "milliseconds": 93784000,
  "negative": false,
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed \"1d 2h 3m 4s\" as 93784000 ms."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
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
  "milliseconds": 93784000,
  "negative": false,
  "humanized": "1 day 2 hours 3 minutes 4 seconds",
  "compact": "1d 2h 3m 4s",
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "largest_unit": "d",
  "reasoning": {
    "why_result_generated": "Decomposed 93784000 ms greedily into 4 unit(s) (largest = d), yielding \"1 day 2 hours 3 minutes 4 seconds\".",
    "key_factors": [
      "Milliseconds: 93784000.",
      "Parts: 1d 2h 3m 4s.",
      "Max units: 6."
    ],
    "invalidators": [
      "Units are fixed, calendar-independent: 1w=7d, 1d=24h, 1h=60m, 1m=60s, 1s=1000ms. Calendar months and years are deliberately NOT supported (their length varies), so a \"month\"/\"year\" token is rejected by /parse.",
      "In /parse, \"m\" means minutes and \"ms\" means milliseconds (matched before \"m\"). /humanize emits integer values per unit; any sub-millisecond remainder is impossible because input must be an integer count of milliseconds.",
      "/humanize truncates (floor) per unit and stops after max_units components; it does not round the dropped remainder into the last shown unit."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
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
