// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.
export const summaryExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 5,
  "periods": 4,
  "periods_per_year": 12,
  "years": 0.333333,
  "total_return_percent": 21,
  "cagr_percent": 77.1561,
  "annualized_arithmetic_percent": 61.220801,
  "mean_period_return_percent": 5.101733,
  "best_period_return_percent": 12.745098,
  "worst_period_return_percent": -5.555556,
  "confidence_score": 1,
  "confidence_per_section": {
    "returns": 1
  },
  "recommended_actions_priority_order": [
    "Total return 21%, CAGR 77.1561% over 0.333333 year(s)."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the same series risk-adjusted (Sharpe/Sortino)."
    },
    {
      "api": "max-drawdown",
      "reason": "Measure the worst peak-to-trough decline of this series."
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
export const cagrExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "begin_value": 100,
  "end_value": 121,
  "periods": 4,
  "periods_per_year": 12,
  "years": 0.333333,
  "total_return_percent": 21,
  "cagr_percent": 77.1561,
  "confidence_score": 1,
  "confidence_per_section": {
    "cagr": 1
  },
  "recommended_actions_priority_order": [
    "CAGR 77.1561% (total 21% over 0.333333 year(s))."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the same series risk-adjusted (Sharpe/Sortino)."
    },
    {
      "api": "max-drawdown",
      "reason": "Measure the worst peak-to-trough decline of this series."
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
  "periods": 4,
  "periods_per_year": 12,
  "years": 0.333333,
  "total_return_percent": 21,
  "cagr_percent": 77.1561,
  "annualized_arithmetic_percent": 61.220801,
  "mean_period_return_percent": 5.101733,
  "best_period_return_percent": 12.745098,
  "worst_period_return_percent": -5.555556,
  "reasoning": {
    "why_result_generated": "Derived 4 period return(s) from 5 levels, then total return 21%, geometric CAGR 77.1561% over 0.333333 year(s), and annualized arithmetic 61.220801%.",
    "key_factors": [
      "Total return 21%.",
      "CAGR 77.1561% (geometric).",
      "Best 12.745098%, worst -5.555556% period."
    ],
    "invalidators": [
      "\"values\" are LEVELS (NAV/price), not returns; period returns are derived from consecutive levels. CAGR uses the geometric end/begin growth; annualized_arithmetic is mean(period return) × periods_per_year and will exceed CAGR when returns are volatile.",
      "years = periods ÷ periods_per_year, where periods = observations − 1. A wrong periods_per_year rescales CAGR and the annualized figure.",
      "Results assume the series is evenly spaced in time and contains no external cashflows; for money-weighted returns with deposits/withdrawals use an IRR-based method instead."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "returns": 1
  },
  "recommended_actions_priority_order": [
    "CAGR 77.1561% vs total 21% — the gap reflects volatility drag."
  ],
  "chain_to": [
    {
      "api": "risk-ratios",
      "reason": "Score the same series risk-adjusted (Sharpe/Sortino)."
    },
    {
      "api": "max-drawdown",
      "reason": "Measure the worst peak-to-trough decline of this series."
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
