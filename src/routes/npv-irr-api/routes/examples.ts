// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.
export const npvExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "rate_percent": 8,
  "period_count": 5,
  "cashflow_total": 500,
  "npv": 238.138382,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "npv": 1
  },
  "recommended_actions_priority_order": [
    "NPV is positive (238.138382) at 8% — the series creates value at this rate.",
    "Solve /irr to find the breakeven rate."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Discount a projected free-cash-flow stream into an enterprise value with a terminal value.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
    },
    {
      "api": "bond-analytics",
      "reason": "Price a fixed-coupon bond or solve its yield to maturity.",
      "url": "https://orbis-apis.onrender.com/bond-analytics"
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
export const irrExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "period_count": 5,
  "cashflow_total": 500,
  "irr_percent": 18.028163,
  "converged": true,
  "npv_at_irr": 0,
  "sign_changes": 1,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "irr": 1
  },
  "recommended_actions_priority_order": [
    "IRR is 18.028163% per period — accept if it exceeds your cost of capital."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Discount a projected free-cash-flow stream into an enterprise value with a terminal value.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
    },
    {
      "api": "bond-analytics",
      "reason": "Price a fixed-coupon bond or solve its yield to maturity.",
      "url": "https://orbis-apis.onrender.com/bond-analytics"
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
  "period_count": 5,
  "cashflow_total": 500,
  "npv": 238.138382,
  "rate_percent": 8,
  "irr_percent": 18.028163,
  "converged": true,
  "sign_changes": 1,
  "reasoning": {
    "why_result_generated": "Computed IRR by bracket-scan + bisection over 5 period(s) and NPV at 8%.",
    "key_factors": [
      "IRR: 18.028163% per period.",
      "NPV at 8%: 238.138382.",
      "Sign changes: 1."
    ],
    "invalidators": [
      "NPV is exact arithmetic at the rate you supply; it changes with the discount rate and the timing/sign of each cashflow (index 0 is treated as today, t=0, and is NOT discounted).",
      "IRR is found numerically (bracket scan + bisection). A series with no sign change has NO real IRR (returns null); a series with multiple sign changes may have multiple IRRs and only the first bracketed root is returned — check sign_changes and prefer NPV at your cost of capital for the decision.",
      "Rates are per PERIOD, not annualized — if your cashflows are monthly, supply a monthly rate and read IRR as a monthly rate."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "npv": 1,
    "irr": 1
  },
  "recommended_actions_priority_order": [
    "Compare the 18.028163% IRR to your hurdle rate; accept if it clears."
  ],
  "chain_to": [
    {
      "api": "dcf-valuation",
      "reason": "Discount a projected free-cash-flow stream into an enterprise value with a terminal value.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
    },
    {
      "api": "bond-analytics",
      "reason": "Price a fixed-coupon bond or solve its yield to maturity.",
      "url": "https://orbis-apis.onrender.com/bond-analytics"
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
