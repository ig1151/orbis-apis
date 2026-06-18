// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.
export const correlationExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "n": 5,
  "correlation": 0.997006,
  "covariance": 2.9924,
  "mean_a": -0.08,
  "mean_b": -0.12,
  "stdev_a": 2.137054,
  "stdev_b": 1.755563,
  "r_squared": 0.994021,
  "relationship": "very strong positive",
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "correlation": 1
  },
  "recommended_actions_priority_order": [
    "Correlation 0.997006 (very strong positive); R² 0.994021."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Combine beta with the Sharpe/Sortino ratios for full risk-adjusted analysis.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "value-at-risk",
      "reason": "Quantify downside risk of the same return series.",
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
export const betaExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "n": 5,
  "beta": 1.21366,
  "alpha_per_period": 0.0656392,
  "r_squared": 0.994021,
  "correlation": 0.997006,
  "mean_asset": -0.08,
  "mean_benchmark": -0.12,
  "benchmark_variance": 2.4656,
  "alpha_annualized_percent": 1654.107722,
  "sensitivity": "more volatile than benchmark",
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "beta": 1
  },
  "recommended_actions_priority_order": [
    "Beta 1.21366 (more volatile than benchmark); alpha 0.0656392/period; R² 0.994021."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Combine beta with the Sharpe/Sortino ratios for full risk-adjusted analysis.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "value-at-risk",
      "reason": "Quantify downside risk of the same return series.",
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
export const lookupExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "n": 5,
  "beta": 1.21366,
  "alpha_per_period": 0.0656392,
  "r_squared": 0.994021,
  "correlation": 0.997006,
  "mean_asset": -0.08,
  "mean_benchmark": -0.12,
  "benchmark_variance": 2.4656,
  "alpha_annualized_percent": 1654.107722,
  "sensitivity": "more volatile than benchmark",
  "correlation_detail": {
    "n": 5,
    "correlation": 0.997006,
    "covariance": 2.9924,
    "mean_a": -0.08,
    "mean_b": -0.12,
    "stdev_a": 2.137054,
    "stdev_b": 1.755563,
    "r_squared": 0.994021,
    "relationship": "very strong positive"
  },
  "reasoning": {
    "why_result_generated": "Over 5 observations the asset has correlation 0.997006 with the benchmark and beta 1.21366 (more volatile than benchmark); the benchmark explains R² 0.994021 of its variance, with Jensen's alpha 0.0656392/period.",
    "key_factors": [
      "Beta 1.21366 — more volatile than benchmark.",
      "Correlation 0.997006 (very strong positive).",
      "R² 0.994021; alpha 0.0656392/period."
    ],
    "invalidators": [
      "Correlation measures LINEAR association only and is unit-free in [-1, 1]; a near-zero correlation does not rule out a non-linear relationship, and correlation is not causation.",
      "Beta = cov(asset, benchmark) / var(benchmark); it is sensitive to the sample window and assumes a stable linear relationship. A short or non-stationary series gives an unreliable beta.",
      "Jensen's alpha here is mean(asset) − beta·mean(benchmark) in the SAME per-period units you supplied; the annualized figure (if returned) is a simple ×periods_per_year scaling, not compounded."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "correlation": 1,
    "beta": 1
  },
  "recommended_actions_priority_order": [
    "High correlation (0.997006) — limited diversification benefit between these two."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Combine beta with the Sharpe/Sortino ratios for full risk-adjusted analysis.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
    },
    {
      "api": "value-at-risk",
      "reason": "Quantify downside risk of the same return series.",
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
