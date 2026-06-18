// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.
export const analyzeExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 5,
  "periods_per_year": 12,
  "max_drawdown_percent": -25,
  "peak_index": 1,
  "trough_index": 2,
  "peak_value": 120,
  "trough_value": 90,
  "drawdown_periods": 1,
  "recovery_index": 4,
  "recovery_periods": 2,
  "recovered": true,
  "cagr_percent": 119.7,
  "calmar_ratio": 4.788,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "drawdown": 1
  },
  "recommended_actions_priority_order": [
    "Max drawdown -25% from index 1 to 2, recovered by index 4."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Pair drawdown with Sharpe/Sortino for a fuller risk picture.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "value-at-risk",
      "reason": "Estimate tail loss over a single period from the return series.",
      "url": "https://orbis-apis.onrender.com/value-at-risk"
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  },
  "financial_disclaimer": "This result is an informational, deterministic calculation based solely on the inputs you provided. It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions."
};
export const lookupExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 5,
  "periods_per_year": 12,
  "max_drawdown_percent": -25,
  "peak_index": 1,
  "trough_index": 2,
  "peak_value": 120,
  "trough_value": 90,
  "drawdown_periods": 1,
  "recovery_index": 4,
  "recovery_periods": 2,
  "recovered": true,
  "cagr_percent": 119.7,
  "calmar_ratio": 4.788,
  "reasoning": {
    "why_result_generated": "Scanned 5 levels for the largest peak-to-trough decline: -25% (peak 120 @1 → trough 90 @2), recovered after 2 period(s).",
    "key_factors": [
      "Max drawdown -25%.",
      "Drawdown lasted 1 period(s).",
      "Calmar 4.788 (CAGR 119.7%)."
    ],
    "invalidators": [
      "\"values\" are LEVELS (NAV/price). The max drawdown is the largest peak-to-trough percentage decline; it is reported as a NEGATIVE percent. Feeding returns instead of levels gives meaningless results.",
      "recovery_index is the first observation that regains the prior peak value; if the series never recovers, recovered=false and recovery_periods=null. The drawdown can still be ongoing at the end of the series.",
      "Calmar = CAGR ÷ |max drawdown| over the supplied window; it is sensitive to the sample length and to periods_per_year. With zero drawdown the ratio is undefined (null)."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "drawdown": 1
  },
  "recommended_actions_priority_order": [
    "Recovered from the -25% drawdown after 2 period(s)."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Pair drawdown with Sharpe/Sortino for a fuller risk picture.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "value-at-risk",
      "reason": "Estimate tail loss over a single period from the return series.",
      "url": "https://orbis-apis.onrender.com/value-at-risk"
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  },
  "financial_disclaimer": "This result is an informational, deterministic calculation based solely on the inputs you provided. It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions."
};
