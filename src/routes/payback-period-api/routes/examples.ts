// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.
export const simpleExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "initial_investment": 100000,
  "periods": 5,
  "total_inflows": 150000,
  "payback_periods": 3.333333,
  "recovered": true,
  "payback_years": 3.333333,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "simple": 1
  },
  "recommended_actions_priority_order": [
    "Recovers the $100000 outlay in 3.333333 periods."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Get the full NPV and IRR of the same cashflow series for an accept/reject decision.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "dcf-valuation",
      "reason": "Value the project as a discounted cashflow stream.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
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
export const discountedExample: any = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "initial_investment": 100000,
  "discount_rate_percent": 10,
  "periods": 5,
  "discounted_payback_periods": 4.263267,
  "recovered": true,
  "payback_years": 4.263267,
  "npv": 13723.603082,
  "profitability_index": 1.137236,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "discounted": 1
  },
  "recommended_actions_priority_order": [
    "Discounted payback 4.263267 periods at 10%; NPV $13723.603082."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Get the full NPV and IRR of the same cashflow series for an accept/reject decision.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "dcf-valuation",
      "reason": "Value the project as a discounted cashflow stream.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
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
  "initial_investment": 100000,
  "periods": 5,
  "total_inflows": 150000,
  "payback_periods": 3.333333,
  "recovered": true,
  "payback_years": 3.333333,
  "discounted": {
    "initial_investment": 100000,
    "discount_rate_percent": 10,
    "periods": 5,
    "discounted_payback_periods": 4.263267,
    "recovered": true,
    "payback_years": 4.263267,
    "npv": 13723.603082,
    "profitability_index": 1.137236
  },
  "reasoning": {
    "why_result_generated": "Simple payback 3.333333 periods (cumulative inflows vs the $100000 outlay); discounted payback 4.263267 periods at 10% with NPV $13723.603082.",
    "key_factors": [
      "Simple payback 3.333333.",
      "Discounted payback 4.263267 at 10%.",
      "NPV $13723.603082 (profitability index 1.137236)."
    ],
    "invalidators": [
      "Payback ignores all cashflows AFTER recovery and (for the simple variant) the time value of money — a shorter payback is not automatically the better investment; use NPV/IRR for the accept/reject decision.",
      "cashflows[k] is the inflow in period k+1; the initial outlay is a separate positive initial_investment, not the first array element.",
      "A null payback means the cumulative (or discounted) inflows never reach the initial investment within the periods supplied."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "simple": 1,
    "discounted": 1
  },
  "recommended_actions_priority_order": [
    "NPV is positive ($13723.603082) — accept on a value basis; chain to npv-irr for the IRR."
  ],
  "chain_to": [
    {
      "api": "npv-irr",
      "reason": "Get the full NPV and IRR of the same cashflow series for an accept/reject decision.",
      "url": "https://orbis-apis.onrender.com/npv-irr"
    },
    {
      "api": "dcf-valuation",
      "reason": "Value the project as a discounted cashflow stream.",
      "url": "https://orbis-apis.onrender.com/dcf-valuation"
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
