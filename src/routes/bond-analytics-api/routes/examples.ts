// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.
export const priceExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "face": 1000,
  "coupon_rate": 5,
  "frequency": 2,
  "periods": 20,
  "yield_percent": 6,
  "price": 925.612626,
  "current_yield_percent": 5.401828,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "price": 1
  },
  "recommended_actions_priority_order": [
    "Bond prices to 925.612626 (at a discount to face 1000) at a 6% yield.",
    "Call /lookup for duration & convexity before estimating rate risk."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Treat the coupon + principal cashflows as a series and compute NPV/IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "risk-ratios",
      "reason": "Fold the bond return into a portfolio Sharpe/Sortino calculation.",
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
export const yieldExample = {
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "face": 1000,
  "coupon_rate": 5,
  "frequency": 2,
  "periods": 20,
  "price": 925.61,
  "yield_to_maturity_percent": 6.000037,
  "converged": true,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "yield": 1
  },
  "recommended_actions_priority_order": [
    "Yield to maturity is 6.000037% at a price of 925.61."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Treat the coupon + principal cashflows as a series and compute NPV/IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "risk-ratios",
      "reason": "Fold the bond return into a portfolio Sharpe/Sortino calculation.",
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
  "trace_id": "gdx-1780000000000",
  "request_id": "gdx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "face": 1000,
  "coupon_rate": 5,
  "frequency": 2,
  "periods": 20,
  "yield_percent": 6,
  "price": 925.612626,
  "current_yield_percent": 5.401828,
  "macaulay_duration_years": 7.894997,
  "modified_duration_years": 7.665046,
  "convexity_years2": 71.785398,
  "reasoning": {
    "why_result_generated": "Discounted 20 period(s) of coupons (25 each) + face 1000 at a 6% annual yield (3% per period).",
    "key_factors": [
      "Price 925.612626 vs face 1000.",
      "Modified duration 7.665046 yr — a +1% yield move ≈ -7.665% price change (before convexity).",
      "Convexity 71.785398 yr²."
    ],
    "invalidators": [
      "Prices/yields use a flat per-period yield with coupons at period ends and n = round(years × frequency) whole periods — there is no accrued-interest / settlement-date day-count (this is clean price on a coupon date, not dirty price).",
      "yield_rate and coupon_rate are ANNUAL percents; the model converts to per-period by dividing by frequency (a bond-equivalent/nominal convention, not effective annual).",
      "Yield-to-maturity is solved numerically by bisection over a per-period band of roughly -50%..+100%; a target price outside that band returns null (converged=false).",
      "Duration is in YEARS (Macaulay and modified); convexity is in years². Modified duration approximates price sensitivity for small yield moves and degrades for large ones — convexity is the second-order correction."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "price": 1,
    "yield": 1
  },
  "recommended_actions_priority_order": [
    "Hold/trade decision: modified duration 7.665 yr sets the rate sensitivity."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Treat the coupon + principal cashflows as a series and compute NPV/IRR.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "risk-ratios",
      "reason": "Fold the bond return into a portfolio Sharpe/Sortino calculation.",
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
