// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.
export const sharpeExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 8,
  "periods_per_year": 12,
  "mean_return_percent": 1.0125,
  "stdev_percent": 1.781201,
  "risk_free_rate_percent": 0.2,
  "sharpe_ratio": 0.456153,
  "annualized_sharpe": 1.58016,
  "annualized_return_percent": 12.15,
  "annualized_volatility_percent": 6.170263,
  "confidence_score": 1,
  "confidence_per_section": {
    "sharpe": 1
  },
  "recommended_actions_priority_order": [
    "Annualized Sharpe 1.58016 (annual return 12.15%, vol 6.170263%).",
    "Use /sortino to score downside risk only."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Value an asset whose risk-adjusted return you just scored."
    },
    {
      "api": "bond-analytics",
      "reason": "Compare the strategy against a fixed-income alternative."
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
export const sortinoExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 8,
  "periods_per_year": 12,
  "mean_return_percent": 1.0125,
  "minimum_acceptable_return_percent": 0,
  "downside_deviation_percent": 0.60208,
  "sortino_ratio": 1.681671,
  "annualized_sortino": 5.825479,
  "confidence_score": 1,
  "confidence_per_section": {
    "sortino": 1
  },
  "recommended_actions_priority_order": [
    "Annualized Sortino 5.825479 vs a 0% minimum-acceptable return."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Value an asset whose risk-adjusted return you just scored."
    },
    {
      "api": "bond-analytics",
      "reason": "Compare the strategy against a fixed-income alternative."
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
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "observations": 8,
  "periods_per_year": 12,
  "mean_return_percent": 1.0125,
  "stdev_percent": 1.781201,
  "annualized_return_percent": 12.15,
  "annualized_volatility_percent": 6.170263,
  "risk_free_rate_percent": 0.2,
  "sharpe_ratio": 0.456153,
  "annualized_sharpe": 1.58016,
  "minimum_acceptable_return_percent": 0,
  "downside_deviation_percent": 0.60208,
  "sortino_ratio": 1.681671,
  "annualized_sortino": 5.825479,
  "reasoning": {
    "why_result_generated": "Computed mean 1.0125% and stdev 1.781201% over 8 periods, then Sharpe (vs 0.2% rf) and Sortino (vs 0% MAR), annualized by √12.",
    "key_factors": [
      "Annualized Sharpe 1.58016; annualized Sortino 5.825479.",
      "Annual return 12.15%, annual vol 6.170263%.",
      "Downside deviation 0.60208% below the 0% MAR."
    ],
    "invalidators": [
      "Returns are treated as PER-PERIOD percents in arithmetic (not geometric/log) terms; mean and standard deviation use the sample (n−1) divisor. Feeding decimals (0.01) instead of percents (1.0) scales every ratio by 100.",
      "Annualization multiplies the periodic ratio by √(periods_per_year) and assumes i.i.d. returns — it overstates the annual ratio when returns autocorrelate. annualized_return is simple (mean × periods), not compounded.",
      "Sharpe divides by total volatility; Sortino divides by downside deviation below the MAR (with an n divisor over ALL observations). With zero volatility (Sharpe) or no downside (Sortino) the ratio is undefined and returned as null."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "sharpe": 1,
    "sortino": 1
  },
  "recommended_actions_priority_order": [
    "Annualized Sharpe 1.58016, Sortino 5.825479 — compare against your benchmark."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Value an asset whose risk-adjusted return you just scored."
    },
    {
      "api": "bond-analytics",
      "reason": "Compare the strategy against a fixed-income alternative."
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
