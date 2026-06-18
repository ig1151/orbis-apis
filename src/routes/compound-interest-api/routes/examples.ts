// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.
export const futureValueExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "principal": 10000,
  "annual_rate_percent": 6,
  "years": 10,
  "compounds_per_year": 12,
  "periods": 120,
  "contribution": 200,
  "contribution_timing": "end",
  "future_value": 50969.84,
  "total_contributions": 24000,
  "total_deposited": 34000,
  "total_interest": 16969.84,
  "effective_annual_rate_percent": 6.167781,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "future_value": 1
  },
  "recommended_actions_priority_order": [
    "Future value 50969.84 after 10y; 16969.84 interest on 34000 deposited."
  ],
  "chain_to": [
    {
      "api": "returns-analytics",
      "reason": "Convert a realized value series into CAGR/total return.",
      "url": "https://orbis-apis.onrender.com/returns-analytics"
    },
    {
      "api": "dcf-valuation",
      "reason": "Discount future cashflows back to present value.",
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
export const effectiveRateExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "nominal_annual_rate_percent": 6,
  "compounds_per_year": 12,
  "period_rate_percent": 0.5,
  "effective_annual_rate_percent": 6.167781,
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "effective_rate": 1
  },
  "recommended_actions_priority_order": [
    "Nominal 6% compounded 12×/yr ⇒ effective 6.167781% APY."
  ],
  "chain_to": [
    {
      "api": "returns-analytics",
      "reason": "Convert a realized value series into CAGR/total return.",
      "url": "https://orbis-apis.onrender.com/returns-analytics"
    },
    {
      "api": "dcf-valuation",
      "reason": "Discount future cashflows back to present value.",
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
export const lookupExample = {
  "trace_id": "gbx-1780000000000",
  "request_id": "gbx-1780000000000",
  "computed_at": "2026-06-16T12:00:00.000Z",
  "success": true,
  "latency_ms": 1,
  "principal": 10000,
  "annual_rate_percent": 6,
  "years": 10,
  "compounds_per_year": 12,
  "periods": 120,
  "contribution": 200,
  "contribution_timing": "end",
  "future_value": 50969.84,
  "total_contributions": 24000,
  "total_deposited": 34000,
  "total_interest": 16969.84,
  "effective_annual_rate_percent": 6.167781,
  "reasoning": {
    "why_result_generated": "Grew 10000 at 6% nominal compounded 12×/yr for 10y (120 periods) with 200/period contributions (end-of-period) → 50969.84.",
    "key_factors": [
      "Future value 50969.84.",
      "Total deposited 34000, interest 16969.84.",
      "Effective annual rate 6.167781% APY."
    ],
    "invalidators": [
      "annual_rate_percent is a NOMINAL annual rate compounded compounds_per_year times; the effective annual rate (APY) is (1 + rate/m)^m − 1 and exceeds the nominal rate whenever m > 1.",
      "Contributions form an ordinary annuity (end of period) by default; set contribution_timing:\"begin\" for an annuity-due (each deposit earns one extra period). total_interest = future_value − principal − total_contributions.",
      "No taxes, fees or inflation are modeled and the rate is assumed constant; results are nominal future dollars. Use a real (inflation-adjusted) rate if you need real purchasing power."
    ]
  },
  "confidence_score": 1,
  "calculation_certainty": 1,
  "confidence_per_section": {
    "future_value": 1
  },
  "recommended_actions_priority_order": [
    "Future value 50969.84 (APY 6.167781%); interest 16969.84 on 34000 deposited."
  ],
  "chain_to": [
    {
      "api": "returns-analytics",
      "reason": "Convert a realized value series into CAGR/total return.",
      "url": "https://orbis-apis.onrender.com/returns-analytics"
    },
    {
      "api": "dcf-valuation",
      "reason": "Discount future cashflows back to present value.",
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
