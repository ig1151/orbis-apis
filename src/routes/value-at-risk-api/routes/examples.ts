// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.
export const historicalExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "method": "historical",
  "observations": 10,
  "confidence": 0.95,
  "alpha": 0.05,
  "threshold_return_percent": -2.86,
  "var_percent": 2.86,
  "cvar_percent": 3.4,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "historical_var": 1
  },
  "recommended_actions_priority_order": [
    "Historical 95% VaR 2.86% (CVaR 3.4%)."
  ],
  "chain_to": [
    {
      "api": "max-drawdown",
      "reason": "Pair single-period tail loss with worst realized peak-to-trough decline.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
    },
    {
      "api": "risk-ratios",
      "reason": "Add Sharpe/Sortino for a risk-adjusted view of the same returns.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
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
export const parametricExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "method": "parametric_gaussian",
  "observations": 10,
  "confidence": 0.95,
  "alpha": 0.05,
  "mean_percent": -0.13,
  "stdev_percent": 1.773916,
  "z_score": -1.644854,
  "var_percent": 3.047832,
  "cvar_percent": 3.789079,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "parametric_var": 1
  },
  "recommended_actions_priority_order": [
    "Gaussian 95% VaR 3.047832% (CVaR 3.789079%)."
  ],
  "chain_to": [
    {
      "api": "max-drawdown",
      "reason": "Pair single-period tail loss with worst realized peak-to-trough decline.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
    },
    {
      "api": "risk-ratios",
      "reason": "Add Sharpe/Sortino for a risk-adjusted view of the same returns.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
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
  "observations": 10,
  "confidence": 0.95,
  "alpha": 0.05,
  "historical": {
    "threshold_return_percent": -2.86,
    "var_percent": 2.86,
    "cvar_percent": 3.4
  },
  "parametric": {
    "mean_percent": -0.13,
    "stdev_percent": 1.773916,
    "z_score": -1.644854,
    "var_percent": 3.047832,
    "cvar_percent": 3.789079
  },
  "reasoning": {
    "why_result_generated": "At 95% confidence (α=0.05) over 10 returns: historical VaR 2.86% / CVaR 3.4%; Gaussian VaR 3.047832% / CVaR 3.789079% using μ=-0.13%, σ=1.773916%.",
    "key_factors": [
      "Historical VaR 2.86%, CVaR 3.4%.",
      "Parametric VaR 3.047832%, CVaR 3.789079%.",
      "z(α)=-1.644854."
    ],
    "invalidators": [
      "Returns are PER-PERIOD percents; VaR/CVaR are reported as POSITIVE loss percents for the SAME period length (not annualized or scaled to a horizon). A negative var_percent means even the tail quantile was a gain.",
      "Historical VaR is the empirical α-quantile (α = 1 − confidence) by linear interpolation; it is only as representative as the sample and says nothing about losses rarer than the data.",
      "Parametric VaR assumes i.i.d. Gaussian returns (VaR = −(μ + zα·σ); CVaR = −(μ − σ·φ(zα)/α)); it understates tail risk for fat-tailed/skewed return distributions. CVaR (expected shortfall) ≥ VaR by construction."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "historical_var": 1,
    "parametric_var": 1
  },
  "recommended_actions_priority_order": [
    "Compare historical (2.86%) vs Gaussian (3.047832%) VaR; a large gap signals non-normal/fat-tailed returns."
  ],
  "chain_to": [
    {
      "api": "max-drawdown",
      "reason": "Pair single-period tail loss with worst realized peak-to-trough decline.",
      "url": "https://orbis-apis.onrender.com/max-drawdown"
    },
    {
      "api": "risk-ratios",
      "reason": "Add Sharpe/Sortino for a risk-adjusted view of the same returns.",
      "url": "https://orbis-apis.onrender.com/risk-ratios"
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
